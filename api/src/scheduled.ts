import type { Env } from './index'

const API = 'https://api.awonderfullife.ca'
const RESEND_BATCH_URL = 'https://api.resend.com/emails/batch'
const PLACEHOLDER = '{{UNSUB_URL}}'

export interface ScheduledDeps {
  // Send a batch of fully-rendered Resend message objects; returns per-batch tallies.
  sendBatch: (apiKey: string, messages: unknown[]) => Promise<{ sent: number; failed: number }>
}

interface IssueRow {
  id: number
  subject: string
  html: string
  text: string
}

interface SubRow {
  email: string
  unsub_token: string
}

// Default sender: Resend's batch endpoint, chunked at its 100-message ceiling.
async function resendSendBatch(
  apiKey: string,
  messages: unknown[],
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    try {
      const res = await fetch(RESEND_BATCH_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify(chunk),
      })
      if (res.ok) sent += chunk.length
      else failed += chunk.length
    } catch {
      failed += chunk.length
    }
  }
  return { sent, failed }
}

export const defaultScheduledDeps: ScheduledDeps = { sendBatch: resendSendBatch }

// Broadcast one issue to all active subscribers; returns tallies. Assumes the row
// was already claimed (status flipped off 'queued') by the caller.
async function broadcastIssue(
  issue: IssueRow,
  env: Env,
  deps: ScheduledDeps,
): Promise<{ sent: number; failed: number }> {
  const subs = await env.DB.prepare(
    `SELECT email, unsub_token FROM subscribers WHERE status = 'active'`,
  ).all<SubRow>()
  const recipients = subs.results ?? []

  const from = env.NEWSLETTER_FROM || 'A Wonderful Life <hello@send.awonderfullife.ca>'
  const replyTo = env.NEWSLETTER_REPLY_TO || 'v@awonderfullife.ca'

  const messages = recipients.map((r) => {
    const unsub = `${API}/unsubscribe?token=${encodeURIComponent(r.unsub_token)}`
    return {
      from,
      to: r.email,
      reply_to: replyTo,
      subject: issue.subject,
      html: issue.html.split(PLACEHOLDER).join(unsub),
      text: issue.text.split(PLACEHOLDER).join(unsub),
      headers: {
        'List-Unsubscribe': `<${unsub}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }
  })

  if (!messages.length) return { sent: 0, failed: 0 }
  return deps.sendBatch(env.RESEND_API_KEY as string, messages)
}

/**
 * The scheduled broadcast, run every 15 minutes by the cron. Sends every issue
 * whose `scheduled_at` has arrived (oldest target time first) — so the default
 * "next Saturday 7pm ET" and any custom time both work, and a missed tick is
 * caught by the next one. Each issue is claimed atomically before sending so a
 * duplicate/overlapping tick can never double-send.
 */
export async function runScheduledSend(
  nowMs: number,
  env: Env,
  overrides: Partial<ScheduledDeps> = {},
): Promise<{ status: string; results?: Array<{ id: number; sent: number; failed: number }> }> {
  const deps = { ...defaultScheduledDeps, ...overrides }
  if (!env.RESEND_API_KEY) return { status: 'skipped_no_key' }

  const nowIso = new Date(nowMs).toISOString()
  const due = await env.DB.prepare(
    `SELECT id, subject, html, text FROM issues
       WHERE status = 'queued' AND scheduled_at IS NOT NULL AND scheduled_at <= ?
       ORDER BY scheduled_at ASC, id ASC`,
  )
    .bind(nowIso)
    .all<IssueRow>()
  const issues = due.results ?? []
  if (!issues.length) return { status: 'nothing_due' }

  const results: Array<{ id: number; sent: number; failed: number }> = []
  for (const issue of issues) {
    const claim = await env.DB.prepare(
      `UPDATE issues SET status = 'sending', sent_at = ? WHERE id = ? AND status = 'queued'`,
    )
      .bind(nowIso, issue.id)
      .run()
    if (!claim.meta.changes) continue // claimed by another tick

    const { sent, failed } = await broadcastIssue(issue, env, deps)
    await env.DB.prepare(
      `UPDATE issues SET status = ?, sent_count = ?, failed_count = ? WHERE id = ?`,
    )
      .bind(failed && !sent ? 'failed' : 'sent', sent, failed, issue.id)
      .run()
    results.push({ id: issue.id, sent, failed })
  }

  return { status: 'sent', results }
}

// ---- reactions abuse-throttle purge ----
// `reaction_events.day` is a plain YYYY-MM-DD marker (no PII — day_hash is opaque and
// never reversed); the sweep just drops rows from any day other than today's UTC date,
// so the throttle table never grows unbounded and never outlives the day it throttled.
export async function purgeReactionEvents(
  env: Env,
  nowMs: number = Date.now(),
): Promise<{ purged: number }> {
  const today = new Date(nowMs).toISOString().slice(0, 10)
  const res = await env.DB.prepare(`DELETE FROM reaction_events WHERE day <> ?`).bind(today).run()
  return { purged: res.meta.changes ?? 0 }
}
