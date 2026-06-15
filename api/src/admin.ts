// Admin compose UI + JSON endpoints, all under /admin (Cloudflare-Access-gated at
// the edge AND in-code via getAccessEmail). Schedule-only: the UI can preview, send
// a test to the logged-in admin, queue for the Saturday cron, and manage the queue —
// there is deliberately no "broadcast to everyone now" path here.
import { renderEmailHtml, renderEmailText } from './render.mjs'
import type { Env } from './index'
import type { ScheduledDeps } from './scheduled'

const API = 'https://api.awonderfullife.ca'
const PLACEHOLDER = '{{UNSUB_URL}}'
const PREVIEW_UNSUB = `${API}/unsubscribe?token=preview`

function ajson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

interface IssueInput {
  subject: string
  preheader: string
  markdown: string
}

async function readIssue(request: Request): Promise<IssueInput | null> {
  try {
    const b = (await request.json()) as Record<string, unknown>
    const subject = typeof b.subject === 'string' ? b.subject.trim() : ''
    const preheader = typeof b.preheader === 'string' ? b.preheader.trim() : ''
    const markdown = typeof b.markdown === 'string' ? b.markdown : ''
    if (!subject || !markdown.trim()) return null
    return { subject, preheader, markdown }
  } catch {
    return null
  }
}

export async function handleAdmin(
  request: Request,
  env: Env,
  email: string,
  deps: ScheduledDeps,
): Promise<Response> {
  const { pathname } = new URL(request.url)
  const method = request.method

  // The compose page itself.
  if (method === 'GET' && pathname === '/admin/compose') {
    return new Response(composeHtml(email), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  // List the queue (and recently sent).
  if (method === 'GET' && pathname === '/admin/issues') {
    const r = await env.DB.prepare(
      `SELECT id, status, subject, queued_at, sent_at, sent_count FROM issues ORDER BY id DESC LIMIT 50`,
    ).all()
    return ajson({ issues: r.results ?? [] })
  }

  // Queue an issue for the weekly send — render once with the placeholder.
  if (method === 'POST' && pathname === '/admin/issues') {
    const issue = await readIssue(request)
    if (!issue) return ajson({ error: 'A subject and body are both required.' }, 400)
    const html = renderEmailHtml({ ...issue, unsub: PLACEHOLDER })
    const text = renderEmailText({ subject: issue.subject, markdown: issue.markdown, unsub: PLACEHOLDER })
    const res = await env.DB.prepare(
      `INSERT INTO issues (subject, preheader, html, text, status, queued_at) VALUES (?, ?, ?, ?, 'queued', ?)`,
    )
      .bind(issue.subject, issue.preheader, html, text, new Date().toISOString())
      .run()
    return ajson({ status: 'queued', id: res.meta.last_row_id })
  }

  // Render a faithful preview (same template as the real email).
  if (method === 'POST' && pathname === '/admin/issues/preview') {
    const issue = await readIssue(request)
    if (!issue) return ajson({ error: 'A subject and body are both required.' }, 400)
    return new Response(renderEmailHtml({ ...issue, unsub: PREVIEW_UNSUB }), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  // Send a test to the LOGGED-IN admin only (never to the list).
  if (method === 'POST' && pathname === '/admin/issues/test') {
    if (!env.RESEND_API_KEY) return ajson({ error: 'Resend key not configured on the Worker.' }, 503)
    const issue = await readIssue(request)
    if (!issue) return ajson({ error: 'A subject and body are both required.' }, 400)
    const message = {
      from: env.NEWSLETTER_FROM || 'A Wonderful Life <hello@send.awonderfullife.ca>',
      to: email,
      reply_to: env.NEWSLETTER_REPLY_TO || 'v@awonderfullife.ca',
      subject: issue.subject,
      html: renderEmailHtml({ ...issue, unsub: PREVIEW_UNSUB }),
      text: renderEmailText({ subject: issue.subject, markdown: issue.markdown, unsub: PREVIEW_UNSUB }),
    }
    const { sent, failed } = await deps.sendBatch(env.RESEND_API_KEY, [message])
    return ajson({ status: sent && !failed ? 'sent' : 'failed', to: email })
  }

  // Pull a queued issue back out (only if still queued).
  if (method === 'POST' && pathname === '/admin/issues/unqueue') {
    let id = 0
    try {
      id = Number((((await request.json()) as Record<string, unknown>).id))
    } catch {
      /* ignore */
    }
    if (!Number.isInteger(id) || id <= 0) return ajson({ error: 'A valid issue id is required.' }, 400)
    const res = await env.DB.prepare(`DELETE FROM issues WHERE id = ? AND status = 'queued'`).bind(id).run()
    return ajson({ removed: res.meta.changes ?? 0 })
  }

  return ajson({ error: 'not_found' }, 404)
}

const esc = (s: string) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

function composeHtml(email: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Compose — A Wonderful Life</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --ink:#111; --soft:#666; --line:#e5e5e5; --accent:#0a4a9a; --bg:#f7f7f8; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:var(--ink); background:var(--bg); line-height:1.5; }
  header { display:flex; align-items:baseline; justify-content:space-between; gap:1rem; padding:1.1rem 1.5rem; background:#fff; border-bottom:1px solid var(--line); position:sticky; top:0; z-index:5; }
  header h1 { font-size:1.05rem; margin:0; letter-spacing:-.02em; }
  header .who { color:var(--soft); font-size:.8rem; }
  main { max-width:1180px; margin:0 auto; padding:1.5rem; display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
  @media (max-width:880px){ main { grid-template-columns:1fr; } }
  .panel { background:#fff; border:1px solid var(--line); border-radius:12px; padding:1.25rem; }
  label { display:block; font-size:.78rem; font-weight:600; text-transform:uppercase; letter-spacing:.04em; color:var(--soft); margin:0 0 .35rem; }
  input, textarea { width:100%; font:inherit; color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:.6rem .7rem; background:#fff; }
  input:focus, textarea:focus { outline:2px solid var(--accent); outline-offset:-1px; border-color:var(--accent); }
  textarea { min-height:340px; resize:vertical; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.9rem; line-height:1.55; }
  .field { margin-bottom:1rem; }
  .hint { font-size:.74rem; color:var(--soft); margin:.3rem 0 0; }
  .actions { display:flex; flex-wrap:wrap; gap:.6rem; margin-top:.4rem; }
  button { font:inherit; font-weight:600; border-radius:8px; padding:.6rem 1rem; border:1px solid var(--line); background:#fff; color:var(--ink); cursor:pointer; }
  button:hover { border-color:#bbb; }
  button.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
  button.primary:hover { filter:brightness(1.08); }
  button:disabled { opacity:.5; cursor:default; }
  .preview-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:.75rem; }
  .preview-head h2 { font-size:.95rem; margin:0; }
  iframe { width:100%; height:520px; border:1px solid var(--line); border-radius:10px; background:#f4f4f5; }
  .toast { position:fixed; left:50%; bottom:1.5rem; transform:translateX(-50%); background:var(--ink); color:#fff; padding:.6rem 1rem; border-radius:8px; font-size:.85rem; opacity:0; transition:opacity .2s; pointer-events:none; max-width:90vw; }
  .toast.show { opacity:1; }
  .toast.err { background:#9a1b1b; }
  .queue { margin-top:1.25rem; }
  .queue h2 { font-size:.95rem; margin:0 0 .6rem; }
  .qitem { display:flex; align-items:center; justify-content:space-between; gap:.75rem; padding:.6rem .7rem; border:1px solid var(--line); border-radius:8px; margin-bottom:.5rem; }
  .qitem .meta { font-size:.78rem; color:var(--soft); }
  .qitem .badge { display:inline-block; font-size:.66rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; padding:.12rem .4rem; border-radius:5px; background:#eef; color:var(--accent); margin-right:.4rem; }
  .qitem .badge.sent { background:#e9f6ec; color:#1d7a37; }
  .qitem button { padding:.35rem .6rem; font-size:.8rem; }
  .empty { color:var(--soft); font-size:.85rem; }
</style>
</head>
<body>
<header>
  <h1>Compose · <span style="color:var(--soft);font-weight:500">A Wonderful Life</span></h1>
  <span class="who">Signed in as ${esc(email)}</span>
</header>
<main>
  <section class="panel">
    <div class="field">
      <label for="subject">Subject</label>
      <input id="subject" type="text" placeholder="Your subject line" autocomplete="off">
    </div>
    <div class="field">
      <label for="preheader">Preheader <span style="font-weight:400;text-transform:none">(inbox preview line, optional)</span></label>
      <input id="preheader" type="text" placeholder="The grey line shown next to the subject" autocomplete="off">
    </div>
    <div class="field">
      <label for="body">Body <span style="font-weight:400;text-transform:none">(Markdown)</span></label>
      <textarea id="body" placeholder="Write your issue in **Markdown**…"></textarea>
      <p class="hint">Bold, italics, links, lists, &gt; blockquotes and ## headings all work. The masthead and unsubscribe footer are added automatically.</p>
    </div>
    <div class="actions">
      <button id="preview" type="button">Preview</button>
      <button id="test" type="button">Send test to me</button>
      <button id="queue" class="primary" type="button">Queue for Saturday</button>
    </div>
    <div class="queue">
      <h2>Queue &amp; recent</h2>
      <div id="qlist"><p class="empty">Loading…</p></div>
    </div>
  </section>
  <section class="panel">
    <div class="preview-head">
      <h2>Preview</h2>
      <span class="hint">Sends Saturday 7pm Eastern · oldest queued first</span>
    </div>
    <iframe id="frame" title="Email preview"></iframe>
  </section>
</main>
<div id="toast" class="toast"></div>
<script>
const $ = (id) => document.getElementById(id);
const toast = (msg, err) => { const t=$('toast'); t.textContent=msg; t.className='toast show'+(err?' err':''); setTimeout(()=>t.className='toast',2600); };
const payload = () => ({ subject: $('subject').value, preheader: $('preheader').value, markdown: $('body').value });
const valid = () => $('subject').value.trim() && $('body').value.trim();

async function api(path, opts={}) {
  const res = await fetch(path, { credentials:'include', ...opts });
  return res;
}

$('preview').onclick = async () => {
  if (!valid()) return toast('Add a subject and body first.', true);
  const res = await api('/admin/issues/preview', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload()) });
  $('frame').srcdoc = await res.text();
};

$('test').onclick = async (e) => {
  if (!valid()) return toast('Add a subject and body first.', true);
  e.target.disabled = true;
  try {
    const res = await api('/admin/issues/test', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload()) });
    const d = await res.json();
    toast(res.ok && d.status==='sent' ? ('Test sent to '+d.to) : ('Test failed: '+(d.error||d.status)), !(res.ok && d.status==='sent'));
  } finally { e.target.disabled = false; }
};

$('queue').onclick = async (e) => {
  if (!valid()) return toast('Add a subject and body first.', true);
  e.target.disabled = true;
  try {
    const res = await api('/admin/issues', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload()) });
    const d = await res.json();
    if (res.ok) { toast('Queued — goes out next Saturday 7pm ET.'); $('subject').value=''; $('preheader').value=''; $('body').value=''; loadQueue(); }
    else toast('Could not queue: '+(d.error||res.status), true);
  } finally { e.target.disabled = false; }
};

async function loadQueue() {
  const res = await api('/admin/issues');
  const { issues } = await res.json();
  const el = $('qlist');
  if (!issues || !issues.length) { el.innerHTML = '<p class="empty">Nothing queued yet.</p>'; return; }
  el.innerHTML = issues.map((i) => {
    const sent = i.status === 'sent';
    const meta = sent ? ('sent '+(i.sent_at||'').slice(0,10)+' · '+(i.sent_count||0)+' recipients') : ('queued '+(i.queued_at||'').slice(0,10));
    const btn = i.status === 'queued' ? '<button data-id="'+i.id+'" class="unq">Unqueue</button>' : '';
    return '<div class="qitem"><div><span class="badge'+(sent?' sent':'')+'">'+i.status+'</span>'+escapeHtml(i.subject)+'<div class="meta">'+meta+'</div></div>'+btn+'</div>';
  }).join('');
  el.querySelectorAll('.unq').forEach((b) => b.onclick = async () => {
    const res = await api('/admin/issues/unqueue', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ id:Number(b.dataset.id) }) });
    const d = await res.json();
    toast(d.removed ? 'Removed from the queue.' : 'Nothing removed.', !d.removed);
    loadQueue();
  });
}
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
loadQueue();
</script>
</body>
</html>`
}
