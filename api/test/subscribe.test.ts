import { describe, it, expect, beforeEach } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { createWorker } from '../src/index'

const okDeps = {
  getAccessEmail: async () => 'x',
  verifyTurnstile: async () => true,
}

function subscribeRequest(body: unknown) {
  return new Request('https://api.awonderfullife.ca/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(async () => {
  await env.DB.prepare('DROP TABLE IF EXISTS subscribers').run()
  await env.DB.prepare(
    `CREATE TABLE subscribers (
       id          INTEGER PRIMARY KEY AUTOINCREMENT,
       email       TEXT NOT NULL UNIQUE,
       status      TEXT NOT NULL DEFAULT 'active',
       consent_at  TEXT NOT NULL,
       source      TEXT,
       unsub_token TEXT NOT NULL UNIQUE,
       created_at  TEXT NOT NULL
     )`,
  ).run()
})

describe('POST /subscribe', () => {
  it('inserts a row and returns 200 on a valid request', async () => {
    const worker = createWorker(okDeps)
    const ctx = createExecutionContext()
    const res = await worker.fetch(
      subscribeRequest({ email: 'Reader@Example.com', token: 'tok', source: 'footer' }),
      env,
      ctx,
    )
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })

    const row = await env.DB.prepare('SELECT email, status, source FROM subscribers WHERE email = ?')
      .bind('reader@example.com')
      .first<{ email: string; status: string; source: string }>()
    expect(row?.email).toBe('reader@example.com')
    expect(row?.status).toBe('active')
    expect(row?.source).toBe('footer')
  })

  it('returns 400 for an invalid email', async () => {
    const worker = createWorker(okDeps)
    const ctx = createExecutionContext()
    const res = await worker.fetch(subscribeRequest({ email: 'not-an-email', token: 'tok' }), env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_email' })
  })

  it('returns 403 when Turnstile verification fails', async () => {
    const worker = createWorker({ ...okDeps, verifyTurnstile: async () => false })
    const ctx = createExecutionContext()
    const res = await worker.fetch(subscribeRequest({ email: 'reader@example.com', token: 'tok' }), env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'turnstile_failed' })
  })

  it('is idempotent: re-subscribing leaves a single active row', async () => {
    const worker = createWorker(okDeps)

    const ctx1 = createExecutionContext()
    const res1 = await worker.fetch(subscribeRequest({ email: 'dup@example.com', token: 'tok' }), env, ctx1)
    await waitOnExecutionContext(ctx1)
    expect(res1.status).toBe(200)

    const ctx2 = createExecutionContext()
    const res2 = await worker.fetch(subscribeRequest({ email: 'dup@example.com', token: 'tok' }), env, ctx2)
    await waitOnExecutionContext(ctx2)
    expect(res2.status).toBe(200)

    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM subscribers WHERE email = ?')
      .bind('dup@example.com')
      .first<{ n: number }>()
    expect(count?.n).toBe(1)

    const row = await env.DB.prepare('SELECT status FROM subscribers WHERE email = ?')
      .bind('dup@example.com')
      .first<{ status: string }>()
    expect(row?.status).toBe('active')
  })

  it('answers an OPTIONS preflight with 204 and CORS headers', async () => {
    const worker = createWorker(okDeps)
    const ctx = createExecutionContext()
    const res = await worker.fetch(
      new Request('https://api.awonderfullife.ca/subscribe', {
        method: 'OPTIONS',
        headers: { Origin: 'https://awonderfullife.ca' },
      }),
      env,
      ctx,
    )
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://awonderfullife.ca')
  })
})

describe('GET /unsubscribe', () => {
  it('deletes the row and returns a 200 html page', async () => {
    const worker = createWorker(okDeps)

    const subCtx = createExecutionContext()
    await worker.fetch(subscribeRequest({ email: 'bye@example.com', token: 'tok' }), env, subCtx)
    await waitOnExecutionContext(subCtx)

    const stored = await env.DB.prepare('SELECT unsub_token FROM subscribers WHERE email = ?')
      .bind('bye@example.com')
      .first<{ unsub_token: string }>()
    const token = stored?.unsub_token ?? ''
    expect(token).not.toBe('')

    const ctx = createExecutionContext()
    const res = await worker.fetch(
      new Request(`https://api.awonderfullife.ca/unsubscribe?token=${token}`),
      env,
      ctx,
    )
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('unsubscribed')

    const after = await env.DB.prepare('SELECT COUNT(*) AS n FROM subscribers WHERE email = ?')
      .bind('bye@example.com')
      .first<{ n: number }>()
    expect(after?.n).toBe(0)
  })
})
