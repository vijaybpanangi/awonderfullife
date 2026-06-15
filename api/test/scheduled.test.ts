import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { isSaturday7pmET, runScheduledSend } from '../src/scheduled'
import type { Env } from '../src/index'

// A test env that reuses the pool's D1 binding but lets us toggle the Resend key.
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

// Saturday 7pm America/New_York lands at two different UTC instants across DST.
const EDT_SAT_7PM = Date.parse('2026-07-04T23:00:00Z') // summer: 7pm EDT
const EST_SAT_7PM = Date.parse('2026-12-13T00:00:00Z') // winter: 7pm EST (Sat in NY)
const EDT_SAT_8PM = Date.parse('2026-07-05T00:00:00Z') // off-by-one twin, summer
const EST_SAT_6PM = Date.parse('2026-12-12T23:00:00Z') // off-by-one twin, winter
const A_TUESDAY = Date.parse('2026-06-16T23:00:00Z')

describe('isSaturday7pmET (DST-correct gate)', () => {
  it('is true at 7pm ET in both EDT and EST, despite different UTC times', () => {
    expect(isSaturday7pmET(EDT_SAT_7PM)).toBe(true)
    expect(isSaturday7pmET(EST_SAT_7PM)).toBe(true)
  })

  it('is false at the off-season UTC twins (would be 8pm EDT / 6pm EST)', () => {
    expect(isSaturday7pmET(EDT_SAT_8PM)).toBe(false)
    expect(isSaturday7pmET(EST_SAT_6PM)).toBe(false)
  })

  it('is false on a non-Saturday', () => {
    expect(isSaturday7pmET(A_TUESDAY)).toBe(false)
  })
})

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
       sent_count INTEGER, failed_count INTEGER
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

async function queueIssue(subject = 'Hello world') {
  await env.DB.prepare(
    `INSERT INTO issues (subject, preheader, html, text, status, queued_at)
     VALUES (?, '', ?, ?, 'queued', '2026-07-01T00:00:00Z')`,
  )
    .bind(subject, `<a href="{{UNSUB_URL}}">unsub</a>`, `Unsubscribe: {{UNSUB_URL}}`)
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

describe('runScheduledSend', () => {
  it('skips outside the Saturday-7pm-ET window', async () => {
    await queueIssue()
    const res = await runScheduledSend(A_TUESDAY, testEnv({ RESEND_API_KEY: 're_test' }))
    expect(res.status).toBe('skipped_not_window')
  })

  it('skips when no Resend key is configured', async () => {
    await queueIssue()
    const res = await runScheduledSend(EDT_SAT_7PM, testEnv({ RESEND_API_KEY: undefined }))
    expect(res.status).toBe('skipped_no_key')
  })

  it('does nothing when the queue is empty', async () => {
    const res = await runScheduledSend(EDT_SAT_7PM, testEnv({ RESEND_API_KEY: 're_test' }))
    expect(res.status).toBe('nothing_queued')
  })

  it('sends the oldest queued issue with per-recipient unsub links, then marks it sent', async () => {
    await queueIssue('First')
    await queueIssue('Second')
    await addSubscriber('a@example.com', 'tok-a')
    await addSubscriber('b@example.com', 'tok-b')

    let captured: any[] = []
    const res = await runScheduledSend(EDT_SAT_7PM, testEnv({ RESEND_API_KEY: 're_test' }), {
      sendBatch: async (_key, messages) => {
        captured = messages as any[]
        return { sent: messages.length, failed: 0 }
      },
    })

    expect(res.status).toBe('sent')
    expect(res.sent).toBe(2)
    expect(captured).toHaveLength(2)
    // Placeholder swapped per recipient; List-Unsubscribe present.
    const toA = captured.find((m) => m.to === 'a@example.com')
    expect(toA.html).toContain('token=tok-a')
    expect(toA.html).not.toContain('{{UNSUB_URL}}')
    expect(toA.headers['List-Unsubscribe']).toContain('token=tok-a')
    expect(toA.subject).toBe('First') // oldest first

    // Issue #1 marked sent; #2 still queued.
    const first = await env.DB.prepare(`SELECT status, sent_count FROM issues WHERE subject = 'First'`)
      .first<{ status: string; sent_count: number }>()
    expect(first?.status).toBe('sent')
    expect(first?.sent_count).toBe(2)
    const second = await env.DB.prepare(`SELECT status FROM issues WHERE subject = 'Second'`)
      .first<{ status: string }>()
    expect(second?.status).toBe('queued')
  })

  it('sends even with zero active subscribers (marks sent, 0 recipients)', async () => {
    await queueIssue()
    let called = false
    const res = await runScheduledSend(EDT_SAT_7PM, testEnv({ RESEND_API_KEY: 're_test' }), {
      sendBatch: async () => {
        called = true
        return { sent: 0, failed: 0 }
      },
    })
    expect(res.status).toBe('sent')
    expect(res.sent).toBe(0)
    expect(called).toBe(false) // no batch call when there are no recipients
  })
})
