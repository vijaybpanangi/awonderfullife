// Shared newsletter render — the single source of truth for the email template,
// imported by BOTH the send CLI (Node) and the Worker (esbuild-bundled). Plain JS
// so Node can run it directly; see render.d.ts for the Worker's TS types.
import { marked } from 'marked'

const SITE = 'https://awonderfullife.ca'
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Render an issue's markdown body + frontmatter into the email-safe HTML template.
// `unsub` is the unsubscribe URL — pass the literal placeholder `{{UNSUB_URL}}` when
// queuing (the scheduled Worker swaps it per recipient at send time).
export function renderEmailHtml({ subject, preheader = '', markdown, unsub }) {
  const bodyHtml = marked.parse(markdown || '')
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

// Plain-text alternative.
export function renderEmailText({ subject, markdown, unsub }) {
  const plain = String(markdown || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/[#>*_`]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return `${subject}\n\n${plain}\n\n— A Wonderful Life · ${SITE}\nUnsubscribe: ${unsub}\n`
}
