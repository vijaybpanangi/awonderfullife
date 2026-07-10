import { describe, it, expect, beforeEach } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { createWorker } from '../src/index'
import { purgeReactionEvents } from '../src/scheduled'
import type { Env } from '../src/index'

const okDeps = { getAccessEmail: async () => 'x', verifyTurnstile: async () => true }

function testEnv(over: Partial<Env> = {}): Env {
  return {
    DB: env.DB,
    ACCESS_TEAM_DOMAIN: 'x',
    ACCESS_AUD: 'x',
    TURNSTILE_SECRET: 'x',
    REACTION_SALT: 'test-salt-please-change-0123456789',
    ...over,
  }
}

async function call(worker: ReturnType<typeof createWorker>, req: Request, over: Partial<Env> = {}) {
  const ctx = createExecutionContext()
  const res = await worker.fetch(req, testEnv(over), ctx)
  await waitOnExecutionContext(ctx)
  return res
}

function getReq(slug: string) {
  return new Request(`https://api.awonderfullife.ca/reactions?slug=${encodeURIComponent(slug)}`)
}

function postReq(body: unknown, ip = '203.0.113.42') {
  return new Request('https://api.awonderfullife.ca/reactions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify(body),
  })
}

beforeEach(async () => {
  await env.DB.prepare('DROP TABLE IF EXISTS reactions').run()
  await env.DB.prepare('DROP TABLE IF EXISTS reaction_events').run()
  await env.DB.prepare(
    `CREATE TABLE reactions (slug TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)`,
  ).run()
  await env.DB.prepare(
    `CREATE TABLE reaction_events (day_hash TEXT NOT NULL, slug TEXT NOT NULL,
       hits INTEGER NOT NULL DEFAULT 1, day TEXT NOT NULL, PRIMARY KEY (day_hash, slug))`,
  ).run()
})

describe('GET /reactions', () => {
  it('returns 0 for an unknown slug', async () => {
    const w = createWorker(okDeps)
    const res = await call(w, getReq('unknown-post'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ count: 0 })
  })

  it('returns the count after increments', async () => {
    const w = createWorker(okDeps)
    await call(w, postReq({ slug: 'a-post' }))
    await call(w, postReq({ slug: 'a-post' }))
    const res = await call(w, getReq('a-post'))
    expect(await res.json()).toEqual({ count: 2 })
  })
})

describe('POST /reactions', () => {
  it('increments and returns the new count', async () => {
    const w = createWorker(okDeps)
    const res = await call(w, postReq({ slug: 'a-post' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ count: 1 })
  })

  it('rejects an invalid slug with 400', async () => {
    const w = createWorker(okDeps)
    const res = await call(w, postReq({ slug: 'Not Valid!' }))
    expect(res.status).toBe(400)
  })

  it('rejects a missing slug with 400', async () => {
    const w = createWorker(okDeps)
    const res = await call(w, postReq({}))
    expect(res.status).toBe(400)
  })

  it('rejects an unparseable/missing body with 400', async () => {
    const w = createWorker(okDeps)
    const ctx = createExecutionContext()
    const res = await w.fetch(
      new Request('https://api.awonderfullife.ca/reactions', { method: 'POST' }),
      testEnv(),
      ctx,
    )
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(400)
  })
})

describe('POST /reactions abuse throttle', () => {
  it('caps at 10/day per slug+IP: the 11th returns throttled with the unchanged count', async () => {
    const w = createWorker(okDeps)
    for (let i = 0; i < 10; i++) {
      const res = await call(w, postReq({ slug: 'popular-post' }))
      expect((await res.json<{ count: number }>()).count).toBe(i + 1)
    }
    const res11 = await call(w, postReq({ slug: 'popular-post' }))
    expect(res11.status).toBe(200)
    expect(await res11.json()).toEqual({ count: 10, throttled: true })
  })

  it('does not throttle a different slug from the same IP', async () => {
    const w = createWorker(okDeps)
    for (let i = 0; i < 10; i++) await call(w, postReq({ slug: 'maxed-out' }))
    const res = await call(w, postReq({ slug: 'other-post' }))
    expect(await res.json()).toEqual({ count: 1 })
  })

  it('does not throttle the same slug from a different IP', async () => {
    const w = createWorker(okDeps)
    for (let i = 0; i < 10; i++) await call(w, postReq({ slug: 'shared-post' }, '198.51.100.7'))
    const res = await call(w, postReq({ slug: 'shared-post' }, '198.51.100.99'))
    expect(await res.json()).toEqual({ count: 11 })
  })

  it('treats a missing CF-Connecting-IP as one fixed bucket, still throttled', async () => {
    const w = createWorker(okDeps)
    const noIpReq = () =>
      new Request('https://api.awonderfullife.ca/reactions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: 'no-ip-post' }),
      })
    for (let i = 0; i < 10; i++) await call(w, noIpReq())
    const res = await call(w, noIpReq())
    expect((await res.json<{ throttled?: boolean }>()).throttled).toBe(true)
  })
})

describe('OPTIONS /reactions', () => {
  it('answers a preflight with 204 and CORS headers', async () => {
    const w = createWorker(okDeps)
    const res = await call(
      w,
      new Request('https://api.awonderfullife.ca/reactions', {
        method: 'OPTIONS',
        headers: { Origin: 'https://awonderfullife.ca' },
      }),
    )
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://awonderfullife.ca')
  })
})

describe('reaction_events purge sweep', () => {
  it('deletes only rows whose day is not today, keeping today\'s', async () => {
    await env.DB.prepare(
      `INSERT INTO reaction_events (day_hash, slug, hits, day) VALUES ('old-hash', 'p', 3, '2020-01-01')`,
    ).run()
    await env.DB.prepare(
      `INSERT INTO reaction_events (day_hash, slug, hits, day) VALUES ('today-hash', 'p', 2, '2026-07-10')`,
    ).run()

    const nowMs = Date.parse('2026-07-10T12:00:00Z')
    const result = await purgeReactionEvents(testEnv(), nowMs)
    expect(result.purged).toBe(1)

    const rows = await env.DB.prepare('SELECT day FROM reaction_events').all<{ day: string }>()
    expect(rows.results?.map((r) => r.day)).toEqual(['2026-07-10'])
  })
})

describe('zero-PII', () => {
  it('never stores the raw IP anywhere after a POST', async () => {
    const w = createWorker(okDeps)
    const ip = '203.0.113.77'
    await call(w, postReq({ slug: 'privacy-post' }, ip))

    const reactions = await env.DB.prepare('SELECT * FROM reactions').all()
    const events = await env.DB.prepare('SELECT * FROM reaction_events').all()
    const dump = JSON.stringify(reactions.results) + JSON.stringify(events.results)
    expect(dump).not.toContain(ip)
  })
})
