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
  preheader: string | null
  html: string
  text: string
}

interface SubRow {
  email: string
  unsub_token: string
}

/**
 * Is `epochMs` within the Saturday 19:00 (7pm) hour in America/New_York?
 *
 * `Intl` carries the IANA tz database, so DST is handled automatically — no
 * hardcoded UTC offset. That's the whole point: 7pm ET is 23:00 UTC in summer
 * (EDT) and 00:00 UTC the next day in winter (EST). The two cron triggers fire
 * at both candidate instants; exactly one passes this gate each week.
 */
export function isSaturday7pmET(epochMs: number): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date(epochMs))
  const weekday = parts.find((p) => p.type === 'weekday')?.value
  const hour = Number(parts.find((p) => p.type === 'hour')?.value)
  return weekday === 'Sat' && hour === 19
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

const defaultScheduledDeps: ScheduledDeps = { sendBatch: resendSendBatch }

/**
 * The weekly broadcast. Fires from the cron handler; gated to Saturday 7pm ET.
 * Sends the single oldest `queued` issue to all active subscribers, then marks
 * it `sent`. Empty queue → no send. Returns a small status object (logged).
 */
export async function runScheduledSend(
  scheduledTime: number,
  env: Env,
  overrides: Partial<ScheduledDeps> = {},
): Promise<{ status: string; issueId?: number; sent?: number; failed?: number }> {
  const deps = { ...defaultScheduledDeps, ...overrides }

  if (!isSaturday7pmET(scheduledTime)) return { status: 'skipped_not_window' }
  if (!env.RESEND_API_KEY) return { status: 'skipped_no_key' }

  const issue = await env.DB.prepare(
    `SELECT id, subject, preheader, html, text FROM issues WHERE status = 'queued' ORDER BY id ASC LIMIT 1`,
  ).first<IssueRow>()
  if (!issue) return { status: 'nothing_queued' }

  // Claim atomically so a duplicate or overlapping tick can never double-send.
  const nowIso = new Date(scheduledTime).toISOString()
  const claim = await env.DB.prepare(
    `UPDATE issues SET status = 'sending', sent_at = ? WHERE id = ? AND status = 'queued'`,
  )
    .bind(nowIso, issue.id)
    .run()
  if (!claim.meta.changes) return { status: 'already_claimed' }

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

  let sent = 0
  let failed = 0
  if (messages.length) {
    const result = await deps.sendBatch(env.RESEND_API_KEY, messages)
    sent = result.sent
    failed = result.failed
  }

  await env.DB.prepare(`UPDATE issues SET status = ?, sent_count = ?, failed_count = ? WHERE id = ?`)
    .bind(failed && !sent ? 'failed' : 'sent', sent, failed, issue.id)
    .run()

  return { status: 'sent', issueId: issue.id, sent, failed }
}
