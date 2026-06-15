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
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const SITE = 'https://awonderfullife.ca'
const API = 'https://api.awonderfullife.ca'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const unsubUrl = (token) => `${API}/unsubscribe?token=${encodeURIComponent(token)}`

// ---- args ----
const args = process.argv.slice(2)
const flags = {}
const positional = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--test') flags.test = args[++i]
  else if (args[i] === '--dry-run') flags.dryRun = true
  else positional.push(args[i])
}
const issuePath = positional[0]
if (!issuePath) {
  console.error('Usage: node scripts/send-issue.mjs <issue.md> [--test <email>] [--dry-run]')
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
if (!KEY) {
  console.error('RESEND_API_KEY is not set. Export it (and optionally NEWSLETTER_FROM) before sending.')
  process.exit(1)
}
console.log(`Sending "${subject}" to ${recipients.length} recipient(s) from ${FROM} …`)
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
