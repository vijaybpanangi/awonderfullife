#!/usr/bin/env node
/**
 * Newsletter send CLI — render a markdown issue and broadcast it via Resend
 * to the owned D1 subscriber list.
 *
 *   node scripts/send-issue.mjs <issue.md> [--test <email>] [--dry-run]
 *
 *   --test <email>   send only to this one address (no D1 lookup)
 *   --dry-run        render + resolve recipients, write issues/.preview.html,
 *                    send nothing  (with --test it works fully offline)
 *
 * Env (local only — never commit):
 *   RESEND_API_KEY    Resend API key
 *   NEWSLETTER_FROM   e.g. "A Wonderful Life <hello@send.awonderfullife.ca>"
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { marked } from 'marked'

const SITE = 'https://awonderfullife.ca'
const API = 'https://api.awonderfullife.ca'
const DB = 'awonderfullife-api'
const PLACEHOLDER = '{{UNSUB_URL}}' // swapped per-subscriber by the scheduled Worker
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const unsubUrl = (token) => `${API}/unsubscribe?token=${encodeURIComponent(token)}`
const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`

// Run a D1 statement (inline SQL or a .sql file) against the remote DB; return parsed JSON.
function d1(opts) {
  const cmd = opts.file ? ['--file', opts.file] : ['--command', opts.command]
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', DB, '--remote', '--json', ...cmd], {
    encoding: 'utf8',
  })
  const parsed = JSON.parse(out.slice(out.indexOf('[')))
  return Array.isArray(parsed) ? parsed[0] : parsed
}

// ---- args ----
const args = process.argv.slice(2)
const flags = {}
const positional = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--test') flags.test = args[++i]
  else if (args[i] === '--dry-run') flags.dryRun = true
  else if (args[i] === '--queue') flags.queue = true
  else if (args[i] === '--queue-list') flags.queueList = true
  else if (args[i] === '--unqueue') flags.unqueue = args[++i]
  else positional.push(args[i])
}

// ---- queue management (no issue file needed) ----
if (flags.queueList) {
  const set = d1({ command: 'SELECT id, status, subject, queued_at, sent_at, sent_count FROM issues ORDER BY id DESC LIMIT 25' })
  const rows = (set && (set.results || set)) || []
  if (!rows.length) {
    console.log('No issues in the queue yet. Queue one with:  npm run send -- issues/<file>.md --queue')
  } else {
    console.log(`Newsletter queue (newest first) — sends Saturday 7pm ET, oldest queued first:\n`)
    for (const r of rows) {
      const when = r.status === 'sent' ? `sent ${r.sent_at} (${r.sent_count ?? 0} recipients)` : r.status === 'queued' ? `queued ${r.queued_at}` : r.status
      console.log(`  #${r.id}  [${r.status.toUpperCase()}]  ${r.subject}\n        ${when}`)
    }
  }
  process.exit(0)
}
if (flags.unqueue !== undefined) {
  if (!/^\d+$/.test(flags.unqueue)) {
    console.error(`--unqueue needs a numeric issue id (see "npm run send -- --queue-list"). Got "${flags.unqueue}".`)
    process.exit(1)
  }
  const res = d1({ command: `DELETE FROM issues WHERE id = ${flags.unqueue} AND status = 'queued'` })
  const changed = res?.meta?.changes ?? res?.meta?.rows_written ?? 0
  if (changed) console.log(`Removed issue #${flags.unqueue} from the queue.`)
  else console.error(`Nothing removed — issue #${flags.unqueue} isn't queued (already sent, sending, or doesn't exist).`)
  process.exit(changed ? 0 : 1)
}

const issuePath = positional[0]
if (!issuePath) {
  console.error('Usage: node scripts/send-issue.mjs <issue.md> [--test <email>] [--dry-run] [--queue]')
  console.error('       node scripts/send-issue.mjs --queue-list | --unqueue <id>')
  process.exit(1)
}
const isAscii = (s) => /^[\x00-\x7F]*$/.test(s)
if (flags.test !== undefined && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(flags.test) || !isAscii(flags.test))) {
  console.error(`--test address "${flags.test}" isn't a real email — looks like the placeholder was pasted. Use an actual address, e.g. --test you@example.com`)
  process.exit(1)
}

// ---- parse issue (frontmatter + markdown body) ----
const raw = readFileSync(issuePath, 'utf8')
const fm = {}
let body = raw
const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
if (fmMatch) {
  for (const line of fmMatch[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx > -1) fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
  }
  body = fmMatch[2]
}
const subject = fm.subject
if (!subject) {
  console.error(`Issue "${issuePath}" is missing a "subject:" line in its --- frontmatter --- block.`)
  process.exit(1)
}
const preheader = fm.preheader || ''
const bodyHtml = marked.parse(body)

// ---- email render ----
function renderHtml(unsub) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;-webkit-font-smoothing:antialiased;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">${esc(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Manrope,Helvetica,Arial,sans-serif;color:#111111;">
  <tr><td style="padding:24px 32px 14px;border-bottom:1px solid #f0f0f0;">
    <a href="${SITE}" style="text-decoration:none;color:#111111;font-weight:700;font-size:18px;letter-spacing:-0.02em;">A Wonderful Life</a>
    <div style="color:#666666;font-size:12px;margin-top:2px;">Data, life, and the space between</div>
  </td></tr>
  <tr><td style="padding:26px 32px;font-size:16px;line-height:1.72;color:#222222;">
${bodyHtml}
  </td></tr>
  <tr><td style="padding:18px 32px 28px;border-top:1px solid #f0f0f0;color:#888888;font-size:12px;line-height:1.6;">
    You're receiving this because you subscribed at <a href="${SITE}" style="color:#0a4a9a;text-decoration:none;">awonderfullife.ca</a>.<br>
    <a href="${unsub}" style="color:#888888;">Unsubscribe</a>
  </td></tr>
</table>
</td></tr></table></body></html>`
}
function renderText(unsub) {
  const plain = body.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)').replace(/[#>*_`]/g, '').replace(/\n{3,}/g, '\n\n').trim()
  return `${subject}\n\n${plain}\n\n— A Wonderful Life · ${SITE}\nUnsubscribe: ${unsub}\n`
}

// ---- queue for the weekly scheduled send ----
// Render ONCE with a {{UNSUB_URL}} placeholder; the Worker swaps it per recipient
// at send time. No subscriber lookup here — the cron handler does that on Saturday.
if (flags.queue) {
  const html = renderHtml(PLACEHOLDER)
  const text = renderText(PLACEHOLDER)
  const queuedAt = new Date().toISOString()
  const sql = `INSERT INTO issues (subject, preheader, html, text, status, queued_at)
VALUES (${sqlStr(subject)}, ${sqlStr(preheader)}, ${sqlStr(html)}, ${sqlStr(text)}, 'queued', ${sqlStr(queuedAt)});`
  const tmp = join(tmpdir(), `awl-issue-${process.pid}.sql`)
  writeFileSync(tmp, sql)
  try {
    d1({ file: tmp })
  } catch (e) {
    console.error('Failed to queue the issue in D1 (is wrangler authenticated?).')
    console.error(e.stderr || e.message)
    process.exit(1)
  } finally {
    try { unlinkSync(tmp) } catch {}
  }
  console.log(`Queued "${subject}" for the next Saturday 7pm ET send.`)
  console.log(`  See the queue:   npm run send -- --queue-list`)
  console.log(`  Pull it back:    npm run send -- --unqueue <id>`)
  process.exit(0)
}

// ---- recipients ----
let recipients
if (flags.test) {
  recipients = [{ email: flags.test, unsub_token: 'preview' }]
} else {
  let out
  try {
    out = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'awonderfullife-api', '--remote', '--json', '--command',
        "SELECT email, unsub_token FROM subscribers WHERE status='active'"],
      { encoding: 'utf8' }
    )
  } catch (e) {
    console.error('Failed to read subscribers from D1 (is wrangler authenticated?).')
    console.error(e.stderr || e.message)
    process.exit(1)
  }
  // wrangler --json prints an array of result sets: [{ results: [...], success, meta }]
  const parsed = JSON.parse(out.slice(out.indexOf('[')))
  const set = Array.isArray(parsed) ? parsed[0] : parsed
  recipients = (set && (set.results || set)) || []
}
if (!recipients.length) {
  console.error('No active recipients found.')
  process.exit(1)
}

// ---- dry run ----
if (flags.dryRun) {
  const previewPath = fileURLToPath(new URL('../issues/.preview.html', import.meta.url))
  writeFileSync(previewPath, renderHtml(unsubUrl(recipients[0].unsub_token)))
  console.log(`DRY RUN — nothing sent.`)
  console.log(`  subject:    "${subject}"`)
  console.log(`  recipients: ${recipients.length}${flags.test ? ` (test only: ${flags.test})` : ' active subscriber(s)'}`)
  console.log(`  preview:    api/issues/.preview.html  (open it in a browser)`)
  process.exit(0)
}

// ---- send via Resend ----
const KEY = process.env.RESEND_API_KEY
const FROM = process.env.NEWSLETTER_FROM || 'A Wonderful Life <hello@send.awonderfullife.ca>'
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO || 'v@awonderfullife.ca'
if (!KEY || !/^re_[A-Za-z0-9_-]+$/.test(KEY)) {
  console.error('RESEND_API_KEY is missing or not a real key — it must look like `re_AbC123…` (ASCII).')
  console.error('You likely pasted the literal placeholder. Export your ACTUAL key from Resend → API keys, then retry.')
  process.exit(1)
}
console.log(`Sending "${subject}" to ${recipients.length} recipient(s) from ${FROM} (reply-to ${REPLY_TO}) …`)
let sent = 0, failed = 0
for (const r of recipients) {
  const unsub = unsubUrl(r.unsub_token)
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: r.email,
        reply_to: REPLY_TO,
        subject,
        html: renderHtml(unsub),
        text: renderText(unsub),
        headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      }),
    })
    if (res.ok) { sent++ } else { failed++; console.error(`  ✗ ${r.email}: ${res.status} ${await res.text()}`) }
  } catch (e) {
    failed++
    console.error(`  ✗ ${r.email}: ${e.message}`)
  }
  await sleep(120) // gentle pacing
}
console.log(`Done. sent=${sent} failed=${failed}`)
process.exit(failed ? 1 : 0)
