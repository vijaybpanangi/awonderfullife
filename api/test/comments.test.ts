import { describe, it, expect, beforeEach } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { SignJWT } from 'jose'
import { createWorker } from '../src/index'
import { runCommentModeration } from '../src/comments'
import type { Env } from '../src/index'

const SECRET = 'test-secret-please-change-0123456789'
const captured: any[] = []
const okDeps = { getAccessEmail: async () => 'x', verifyTurnstile: async () => true }
const sendStub = { sendBatch: async (_k: string, m: unknown[]) => { captured.push(...(m as any[])); return { sent: m.length, failed: 0 } } }

function testEnv(over: Partial<Env> = {}): Env {
  return {
    DB: env.DB, ACCESS_TEAM_DOMAIN: 'x', ACCESS_AUD: 'x', TURNSTILE_SECRET: 'x',
    RESEND_API_KEY: 're_test', NEWSLETTER_FROM: 'A <hello@send.awonderfullife.ca>',
    NEWSLETTER_REPLY_TO: 'v@awonderfullife.ca', COMMENT_SECRET: SECRET, ...over,
  }
}
async function call(worker: ReturnType<typeof createWorker>, req: Request, over: Partial<Env> = {}) {
  const ctx = createExecutionContext()
  const res = await worker.fetch(req, testEnv(over), ctx)
  await waitOnExecutionContext(ctx)
  return res
}
const post = (body: unknown, cookie?: string) =>
  new Request('https://api.awonderfullife.ca/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })

beforeEach(async () => {
  captured.length = 0
  await env.DB.prepare('DROP TABLE IF EXISTS comments').run()
  await env.DB.prepare('DROP TABLE IF EXISTS comment_verifications').run()
  await env.DB.prepare(
    `CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL, name TEXT NOT NULL,
      email TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'unverified', mod_reason TEXT,
      created_at TEXT NOT NULL, verified_at TEXT, moderated_at TEXT)`,
  ).run()
  await env.DB.prepare(
    `CREATE TABLE comment_verifications (token TEXT PRIMARY KEY, comment_id INTEGER NOT NULL,
      email TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)`,
  ).run()
})

describe('POST /comments (no session)', () => {
  it('stores an unverified comment and emails a magic link', async () => {
    const w = createWorker(okDeps, sendStub)
    const res = await call(w, post({ slug: 'a-post', name: 'Reader', email: 'r@example.com', body: 'Nice piece.', token: 't' }))
    expect(res.status).toBe(200)
    expect((await res.json<{ status: string }>()).status).toBe('verification_sent')
    const row = await env.DB.prepare(`SELECT status FROM comments WHERE slug='a-post'`).first<{ status: string }>()
    expect(row?.status).toBe('unverified')
    expect(captured).toHaveLength(1)
    expect(captured[0].text).toContain('/comments/verify?token=')
  })

  it('rejects on Turnstile failure', async () => {
    const w = createWorker({ ...okDeps, verifyTurnstile: async () => false }, sendStub)
    const res = await call(w, post({ slug: 'a-post', name: 'R', email: 'r@example.com', body: 'hello', token: 't' }))
    expect(res.status).toBe(403)
  })
})

describe('GET /comments/verify', () => {
  it('publishes the comment and sets a session cookie', async () => {
    const w = createWorker(okDeps, sendStub)
    await call(w, post({ slug: 'a-post', name: 'R', email: 'r@example.com', body: 'hello there', token: 't' }))
    const v = await env.DB.prepare(`SELECT token FROM comment_verifications LIMIT 1`).first<{ token: string }>()
    const res = await call(w, new Request(`https://api.awonderfullife.ca/comments/verify?token=${v!.token}`))
    expect(res.status).toBe(302)
    expect(res.headers.get('Set-Cookie')).toContain('awl_c=')
    const row = await env.DB.prepare(`SELECT status FROM comments WHERE slug='a-post'`).first<{ status: string }>()
    expect(row?.status).toBe('visible')
  })

  it('rejects an invalid token', async () => {
    const w = createWorker(okDeps, sendStub)
    expect((await call(w, new Request('https://api.awonderfullife.ca/comments/verify?token=nope'))).status).toBe(400)
  })
})

describe('POST with a valid session', () => {
  it('publishes immediately without emailing', async () => {
    const jwt = await new SignJWT({ email: 'r@example.com' }).setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d').sign(new TextEncoder().encode(SECRET))
    const w = createWorker(okDeps, sendStub)
    const res = await call(w, post({ slug: 'a-post', name: 'R', body: 'second comment', token: 't' }, `awl_c=${jwt}`))
    expect((await res.json<{ status: string }>()).status).toBe('posted')
    const row = await env.DB.prepare(`SELECT status FROM comments WHERE body='second comment'`).first<{ status: string }>()
    expect(row?.status).toBe('visible')
    expect(captured).toHaveLength(0) // no email
  })
})

describe('GET /comments + moderation sweep', () => {
  it('lists visible comments and tombstones flagged ones', async () => {
    const now = new Date().toISOString()
    await env.DB.prepare(`INSERT INTO comments (slug,name,email,body,status,created_at) VALUES ('p','Ann','a@x.com','Good read',  'visible',?)`).bind(now).run()
    await env.DB.prepare(`INSERT INTO comments (slug,name,email,body,status,created_at) VALUES ('p','Bot','b@x.com','buy crypto now','visible',?)`).bind(now).run()

    const r = await runCommentModeration(testEnv(), {
      classify: async (body) => body.includes('crypto') ? { flag: true, reason: 'spam' } : { flag: false, reason: '' },
    })
    expect(r.checked).toBe(2)
    expect(r.removed).toBe(1)

    const w = createWorker(okDeps, sendStub)
    const list = await (await call(w, new Request('https://api.awonderfullife.ca/comments?slug=p'))).json<{ comments: Array<{ name: string | null; body: string; removed: boolean }> }>()
    expect(list.comments).toHaveLength(2)
    const good = list.comments.find((c) => c.name === 'Ann')
    const gone = list.comments.find((c) => c.removed)
    expect(good?.body).toBe('Good read')
    expect(gone?.name).toBeNull()
    expect(gone?.body).toContain('failed our moderation checks')
  })

  it('marks clean comments moderated without removing', async () => {
    await env.DB.prepare(`INSERT INTO comments (slug,name,email,body,status,created_at) VALUES ('p','Ann','a@x.com','thoughtful','visible',?)`).bind(new Date().toISOString()).run()
    const r = await runCommentModeration(testEnv(), { classify: async () => ({ flag: false, reason: '' }) })
    expect(r.removed).toBe(0)
    const row = await env.DB.prepare(`SELECT status, moderated_at FROM comments WHERE slug='p'`).first<{ status: string; moderated_at: string }>()
    expect(row?.status).toBe('visible')
    expect(row?.moderated_at).not.toBeNull()
  })
})
