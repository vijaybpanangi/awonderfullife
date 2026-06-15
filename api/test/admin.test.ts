import { describe, it, expect, beforeEach } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { createWorker } from '../src/index'

const adminEmail = 'me@example.com'
const authed = { getAccessEmail: async () => adminEmail, verifyTurnstile: async () => true }

function req(path: string, method = 'GET', body?: unknown) {
  return new Request('https://api.awonderfullife.ca' + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function call(worker: ReturnType<typeof createWorker>, request: Request, envOver: Record<string, unknown> = {}) {
  const ctx = createExecutionContext()
  const useEnv = { ...env, ...envOver } as typeof env
  const res = await worker.fetch(request, useEnv, ctx)
  await waitOnExecutionContext(ctx)
  return res
}

const ISSUE = { subject: 'Hello readers', preheader: 'a preview', markdown: '# Hi\n\nThis is **bold** and a [link](https://x.com).' }

beforeEach(async () => {
  await env.DB.prepare('DROP TABLE IF EXISTS issues').run()
  await env.DB.prepare(
    `CREATE TABLE issues (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       subject TEXT NOT NULL, preheader TEXT,
       html TEXT NOT NULL, text TEXT NOT NULL,
       status TEXT NOT NULL DEFAULT 'queued',
       queued_at TEXT NOT NULL, sent_at TEXT,
       sent_count INTEGER, failed_count INTEGER
     )`,
  ).run()
})

describe('admin auth gate', () => {
  it('returns 403 for /admin/* without a valid Access identity', async () => {
    const worker = createWorker({ getAccessEmail: async () => { throw new Error('no') } })
    expect((await call(worker, req('/admin/compose'))).status).toBe(403)
    expect((await call(worker, req('/admin/issues'))).status).toBe(403)
  })
})

describe('GET /admin/compose', () => {
  it('serves the compose page showing the signed-in email', async () => {
    const worker = createWorker(authed)
    const res = await call(worker, req('/admin/compose'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('Compose')
    expect(html).toContain(adminEmail)
  })
})

describe('POST /admin/issues (queue)', () => {
  it('queues a valid issue and stores it with the unsub placeholder', async () => {
    const worker = createWorker(authed)
    const res = await call(worker, req('/admin/issues', 'POST', ISSUE))
    expect(res.status).toBe(200)
    const d = await res.json<{ status: string; id: number }>()
    expect(d.status).toBe('queued')

    const row = await env.DB.prepare('SELECT subject, status, html FROM issues WHERE id = ?')
      .bind(d.id)
      .first<{ subject: string; status: string; html: string }>()
    expect(row?.subject).toBe('Hello readers')
    expect(row?.status).toBe('queued')
    expect(row?.html).toContain('{{UNSUB_URL}}')
    expect(row?.html).toContain('<strong>bold</strong>')
  })

  it('rejects an issue missing subject or body', async () => {
    const worker = createWorker(authed)
    expect((await call(worker, req('/admin/issues', 'POST', { subject: '', markdown: 'x' }))).status).toBe(400)
    expect((await call(worker, req('/admin/issues', 'POST', { subject: 'x', markdown: '  ' }))).status).toBe(400)
  })
})

describe('GET /admin/issues (list)', () => {
  it('lists queued issues newest-first', async () => {
    const worker = createWorker(authed)
    await call(worker, req('/admin/issues', 'POST', { ...ISSUE, subject: 'First' }))
    await call(worker, req('/admin/issues', 'POST', { ...ISSUE, subject: 'Second' }))
    const res = await call(worker, req('/admin/issues'))
    const { issues } = await res.json<{ issues: Array<{ subject: string; status: string }> }>()
    expect(issues.map((i) => i.subject)).toEqual(['Second', 'First'])
    expect(issues[0].status).toBe('queued')
  })
})

describe('POST /admin/issues/preview', () => {
  it('returns rendered HTML with the masthead and body', async () => {
    const worker = createWorker(authed)
    const res = await call(worker, req('/admin/issues/preview', 'POST', ISSUE))
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('A Wonderful Life')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).not.toContain('{{UNSUB_URL}}') // preview uses a real sample token
  })
})

describe('POST /admin/issues/test', () => {
  it('sends a test to the signed-in admin via the injected sender', async () => {
    let captured: any[] = []
    const worker = createWorker(authed, {
      sendBatch: async (_key, messages) => {
        captured = messages as any[]
        return { sent: messages.length, failed: 0 }
      },
    })
    const res = await call(worker, req('/admin/issues/test', 'POST', ISSUE), { RESEND_API_KEY: 're_test' })
    expect(res.status).toBe(200)
    const d = await res.json<{ status: string; to: string }>()
    expect(d.status).toBe('sent')
    expect(d.to).toBe(adminEmail)
    expect(captured).toHaveLength(1)
    expect(captured[0].to).toBe(adminEmail)
    expect(captured[0].html).toContain('<strong>bold</strong>')
  })

  it('returns 503 when no Resend key is configured', async () => {
    const worker = createWorker(authed)
    const res = await call(worker, req('/admin/issues/test', 'POST', ISSUE))
    expect(res.status).toBe(503)
  })
})

describe('POST /admin/issues/unqueue', () => {
  it('removes a queued issue and is a no-op for a bad id', async () => {
    const worker = createWorker(authed)
    const q = await (await call(worker, req('/admin/issues', 'POST', ISSUE))).json<{ id: number }>()

    const ok = await call(worker, req('/admin/issues/unqueue', 'POST', { id: q.id }))
    expect((await ok.json<{ removed: number }>()).removed).toBe(1)

    const gone = await call(worker, req('/admin/issues/unqueue', 'POST', { id: q.id }))
    expect((await gone.json<{ removed: number }>()).removed).toBe(0)

    expect((await call(worker, req('/admin/issues/unqueue', 'POST', { id: 0 }))).status).toBe(400)
  })
})
