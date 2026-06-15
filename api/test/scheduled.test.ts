import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { runScheduledSend } from '../src/scheduled'
import type { Env } from '../src/index'

function testEnv(over: Partial<Env> = {}): Env {
  return {
    DB: env.DB,
    ACCESS_TEAM_DOMAIN: 'x',
    ACCESS_AUD: 'x',
    TURNSTILE_SECRET: 'x',
    NEWSLETTER_FROM: 'A Wonderful Life <hello@send.awonderfullife.ca>',
    NEWSLETTER_REPLY_TO: 'v@awonderfullife.ca',
    ...over,
  }
}

const NOW = Date.parse('2026-07-04T23:30:00Z')
const PAST = '2026-07-04T23:00:00.000Z' // <= NOW: due
const FUTURE = '2026-07-11T23:00:00.000Z' // > NOW: not yet

beforeEach(async () => {
  await env.DB.prepare('DROP TABLE IF EXISTS issues').run()
  await env.DB.prepare('DROP TABLE IF EXISTS subscribers').run()
  await env.DB.prepare(
    `CREATE TABLE issues (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       subject TEXT NOT NULL, preheader TEXT,
       html TEXT NOT NULL, text TEXT NOT NULL,
       status TEXT NOT NULL DEFAULT 'queued',
       queued_at TEXT NOT NULL, sent_at TEXT,
       sent_count INTEGER, failed_count INTEGER, scheduled_at TEXT
     )`,
  ).run()
  await env.DB.prepare(
    `CREATE TABLE subscribers (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       email TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'active',
       consent_at TEXT NOT NULL, source TEXT,
       unsub_token TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
     )`,
  ).run()
})

async function queueIssue(subject: string, scheduledAt: string) {
  await env.DB.prepare(
    `INSERT INTO issues (subject, preheader, html, text, status, queued_at, scheduled_at)
     VALUES (?, '', ?, ?, 'queued', '2026-07-01T00:00:00Z', ?)`,
  )
    .bind(subject, `<a href="{{UNSUB_URL}}">unsub</a>`, `Unsubscribe: {{UNSUB_URL}}`, scheduledAt)
    .run()
}

async function addSubscriber(email: string, token: string) {
  await env.DB.prepare(
    `INSERT INTO subscribers (email, status, consent_at, unsub_token, created_at)
     VALUES (?, 'active', '2026-01-01T00:00:00Z', ?, '2026-01-01T00:00:00Z')`,
  )
    .bind(email, token)
    .run()
}

describe('runScheduledSend (due-based)', () => {
  it('skips when no Resend key is configured', async () => {
    await queueIssue('x', PAST)
    expect((await runScheduledSend(NOW, testEnv({ RESEND_API_KEY: undefined }))).status).toBe('skipped_no_key')
  })

  it('does nothing when nothing is due', async () => {
    await queueIssue('later', FUTURE)
    expect((await runScheduledSend(NOW, testEnv({ RESEND_API_KEY: 're_test' }))).status).toBe('nothing_due')
  })

  it('sends only the due issue, swaps per-recipient unsub, and marks it sent', async () => {
    await queueIssue('Due now', PAST)
    await queueIssue('Not yet', FUTURE)
    await addSubscriber('a@example.com', 'tok-a')
    await addSubscriber('b@example.com', 'tok-b')

    let captured: any[] = []
    const res = await runScheduledSend(NOW, testEnv({ RESEND_API_KEY: 're_test' }), {
      sendBatch: async (_k, messages) => {
        captured = messages as any[]
        return { sent: messages.length, failed: 0 }
      },
    })

    expect(res.status).toBe('sent')
    expect(res.results).toHaveLength(1)
    expect(captured).toHaveLength(2)
    const toA = captured.find((m) => m.to === 'a@example.com')
    expect(toA.html).toContain('token=tok-a')
    expect(toA.html).not.toContain('{{UNSUB_URL}}')
    expect(toA.headers['List-Unsubscribe']).toContain('token=tok-a')

    const due = await env.DB.prepare(`SELECT status, sent_count FROM issues WHERE subject='Due now'`).first<{ status: string; sent_count: number }>()
    expect(due?.status).toBe('sent')
    expect(due?.sent_count).toBe(2)
    const later = await env.DB.prepare(`SELECT status FROM issues WHERE subject='Not yet'`).first<{ status: string }>()
    expect(later?.status).toBe('queued')
  })

  it('does not double-send: a second tick finds nothing due', async () => {
    await queueIssue('Once', PAST)
    await addSubscriber('a@example.com', 'tok-a')
    const send = () => runScheduledSend(NOW, testEnv({ RESEND_API_KEY: 're_test' }), { sendBatch: async (_k, m) => ({ sent: (m as any[]).length, failed: 0 }) })
    expect((await send()).status).toBe('sent')
    expect((await send()).status).toBe('nothing_due')
  })

  it('marks sent with zero subscribers without calling the sender', async () => {
    await queueIssue('Empty list', PAST)
    let called = false
    const res = await runScheduledSend(NOW, testEnv({ RESEND_API_KEY: 're_test' }), {
      sendBatch: async () => {
        called = true
        return { sent: 0, failed: 0 }
      },
    })
    expect(res.status).toBe('sent')
    expect(called).toBe(false)
  })
})
