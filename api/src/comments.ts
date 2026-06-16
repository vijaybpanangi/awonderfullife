// Post comments: verify-by-email (magic link) then publish immediately; a moderation
// sweep tombstones failures in place. Email is stored for verification only, never shown.
import { SignJWT, jwtVerify } from 'jose'
import type { Env } from './index'
import type { ScheduledDeps } from './scheduled'

const SITE = 'https://awonderfullife.ca'
const API = 'https://api.awonderfullife.ca'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SESSION_DAYS = 30
const TOMBSTONE = 'This comment was removed because it failed our moderation checks.'

function jc(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  })
}

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = origin === SITE || origin === 'https://www.awonderfullife.ca'
  return {
    'Access-Control-Allow-Origin': allowed ? origin : SITE,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  }
}

const SLUG_RE = /^[a-z0-9-]{1,120}$/
const clamp = (s: string, n: number) => s.slice(0, n)

async function sessionEmail(request: Request, env: Env): Promise<string | null> {
  if (!env.COMMENT_SECRET) return null
  const cookie = request.headers.get('Cookie') ?? ''
  const m = cookie.match(/(?:^|;\s*)awl_c=([^;]+)/)
  if (!m) return null
  try {
    const { payload } = await jwtVerify(m[1], new TextEncoder().encode(env.COMMENT_SECRET))
    return typeof payload.email === 'string' ? payload.email : null
  } catch {
    return null
  }
}

async function mintSession(email: string, env: Env): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(new TextEncoder().encode(env.COMMENT_SECRET as string))
}

// ---- public list ----
async function listComments(slug: string, env: Env, request: Request): Promise<Response> {
  if (!SLUG_RE.test(slug)) return jc({ comments: [] }, 200, cors(request))
  const r = await env.DB.prepare(
    `SELECT id, name, body, status, created_at FROM comments
       WHERE slug = ? AND status IN ('visible','removed') ORDER BY id ASC LIMIT 500`,
  )
    .bind(slug)
    .all<{ id: number; name: string; body: string; status: string; created_at: string }>()
  const comments = (r.results ?? []).map((c) => ({
    id: c.id,
    name: c.status === 'removed' ? null : c.name,
    body: c.status === 'removed' ? TOMBSTONE : c.body,
    removed: c.status === 'removed',
    created_at: c.created_at,
  }))
  return jc({ comments }, 200, cors(request))
}

// ---- submit ----
async function postComment(
  request: Request,
  env: Env,
  deps: { verifyTurnstile: (t: string, ip: string | null, e: Env) => Promise<boolean> },
  send: ScheduledDeps['sendBatch'],
): Promise<Response> {
  const c = cors(request)
  let b: Record<string, unknown>
  try {
    b = (await request.json()) as Record<string, unknown>
  } catch {
    return jc({ error: 'bad_request' }, 400, c)
  }
  const slug = typeof b.slug === 'string' ? b.slug : ''
  const name = typeof b.name === 'string' ? clamp(b.name.trim(), 80) : ''
  const body = typeof b.body === 'string' ? clamp(b.body.trim(), 4000) : ''
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
  const token = typeof b.token === 'string' ? b.token : ''
  if (!SLUG_RE.test(slug) || !name || body.length < 2) return jc({ error: 'invalid' }, 400, c)

  // Already verified this browser? Publish immediately, no email round-trip.
  const session = await sessionEmail(request, env)
  const now = new Date().toISOString()

  if (session) {
    const ok = await deps.verifyTurnstile(token, request.headers.get('CF-Connecting-IP'), env)
    if (!ok) return jc({ error: 'turnstile_failed' }, 403, c)
    await env.DB.prepare(
      `INSERT INTO comments (slug, name, email, body, status, created_at, verified_at)
       VALUES (?, ?, ?, ?, 'visible', ?, ?)`,
    )
      .bind(slug, name, session, body, now, now)
      .run()
    return jc({ status: 'posted' }, 200, c)
  }

  // Otherwise require email + Turnstile, store pending, send a magic link.
  if (email.length > 254 || !EMAIL_RE.test(email)) return jc({ error: 'invalid_email' }, 400, c)
  const ok = await deps.verifyTurnstile(token, request.headers.get('CF-Connecting-IP'), env)
  if (!ok) return jc({ error: 'turnstile_failed' }, 403, c)
  if (!env.RESEND_API_KEY) return jc({ error: 'email_unavailable' }, 503, c)

  const res = await env.DB.prepare(
    `INSERT INTO comments (slug, name, email, body, status, created_at) VALUES (?, ?, ?, ?, 'unverified', ?)`,
  )
    .bind(slug, name, email, body, now)
    .run()
  const commentId = res.meta.last_row_id as number
  const vtoken = crypto.randomUUID()
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() // 24h
  await env.DB.prepare(
    `INSERT INTO comment_verifications (token, comment_id, email, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(vtoken, commentId, email, expires, now)
    .run()

  const link = `${API}/comments/verify?token=${vtoken}`
  const html = `<p>Hi ${escapeHtml(name)},</p><p>Confirm this email to post your comment on <a href="${SITE}">A Wonderful Life</a>:</p><p><a href="${link}">Confirm and publish my comment</a></p><p>This link expires in 24 hours. If you didn't write a comment, ignore this.</p>`
  await send(env.RESEND_API_KEY, [
    {
      from: env.NEWSLETTER_FROM || 'A Wonderful Life <hello@send.awonderfullife.ca>',
      to: email,
      reply_to: env.NEWSLETTER_REPLY_TO || 'v@awonderfullife.ca',
      subject: 'Confirm your comment on A Wonderful Life',
      html,
      text: `Confirm and publish your comment: ${link}\nThis link expires in 24 hours.`,
    },
  ])
  return jc({ status: 'verification_sent' }, 200, c)
}

// ---- verify (magic link click) ----
async function verifyComment(token: string, env: Env): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT comment_id, email, expires_at FROM comment_verifications WHERE token = ?`,
  )
    .bind(token)
    .first<{ comment_id: number; email: string; expires_at: string }>()
  let slug = ''
  if (row && row.expires_at > new Date().toISOString()) {
    const now = new Date().toISOString()
    await env.DB.prepare(
      `UPDATE comments SET status = 'visible', verified_at = ? WHERE id = ? AND status = 'unverified'`,
    )
      .bind(now, row.comment_id)
      .run()
    await env.DB.prepare(`DELETE FROM comment_verifications WHERE token = ?`).bind(token).run()
    const cr = await env.DB.prepare(`SELECT slug FROM comments WHERE id = ?`).bind(row.comment_id).first<{ slug: string }>()
    slug = cr?.slug ?? ''
    const dest = slug ? `${SITE}/posts/${slug}#comments` : SITE
    const headers: Record<string, string> = { Location: dest }
    if (env.COMMENT_SECRET) {
      const jwt = await mintSession(row.email, env)
      headers['Set-Cookie'] =
        `awl_c=${jwt}; Domain=awonderfullife.ca; Path=/; Max-Age=${SESSION_DAYS * 86400}; Secure; HttpOnly; SameSite=None`
    }
    return new Response(null, { status: 302, headers })
  }
  return new Response('This confirmation link is invalid or has expired.', {
    status: 400,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

export async function handleComments(
  request: Request,
  env: Env,
  deps: { verifyTurnstile: (t: string, ip: string | null, e: Env) => Promise<boolean> },
  send: ScheduledDeps['sendBatch'],
): Promise<Response> {
  const { pathname, searchParams } = new URL(request.url)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request) })
  if (request.method === 'GET' && pathname === '/comments') {
    return listComments(searchParams.get('slug') ?? '', env, request)
  }
  if (request.method === 'POST' && pathname === '/comments') {
    return postComment(request, env, deps, send)
  }
  if (request.method === 'GET' && pathname === '/comments/verify') {
    return verifyComment(searchParams.get('token') ?? '', env)
  }
  return jc({ error: 'not_found' }, 404, cors(request))
}

// ---- moderation sweep ----
const URL_RE = /https?:\/\/|www\./gi
const BANNED = /\b(viagra|casino|porn|crypto giveaway|seo services|buy followers|loan offer)\b/i

function heuristicFlag(body: string): string | null {
  const links = (body.match(URL_RE) || []).length
  if (links >= 3) return 'too many links'
  if (BANNED.test(body)) return 'matched a spam pattern'
  if (/(.)\1{15,}/.test(body)) return 'spam (repeated characters)'
  return null
}

// Default classifier: heuristics first, then Workers AI for borderline/abusive content.
async function defaultClassify(
  body: string,
  env: Env,
): Promise<{ flag: boolean; reason: string }> {
  const h = heuristicFlag(body)
  if (h) return { flag: true, reason: h }
  if (!env.AI) return { flag: false, reason: '' }
  try {
    const out = (await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content:
            'You moderate blog comments. Reply with ONLY "OK" if the comment is acceptable, or "BLOCK: <short reason>" if it is spam, hateful, harassing, or abusive. Disagreement and criticism are acceptable.',
        },
        { role: 'user', content: body },
      ],
      max_tokens: 20,
    })) as { response?: string }
    const t = (out.response ?? '').trim()
    if (/^block/i.test(t)) return { flag: true, reason: t.replace(/^block:?\s*/i, '').slice(0, 80) || 'failed moderation' }
    return { flag: false, reason: '' }
  } catch {
    return { flag: false, reason: '' } // AI unavailable: don't block (heuristics already ran)
  }
}

export interface CommentModerationDeps {
  classify: (body: string, env: Env) => Promise<{ flag: boolean; reason: string }>
}

export async function runCommentModeration(
  env: Env,
  overrides: Partial<CommentModerationDeps> = {},
): Promise<{ checked: number; removed: number }> {
  const classify = overrides.classify ?? defaultClassify
  const due = await env.DB.prepare(
    `SELECT id, body FROM comments WHERE status = 'visible' AND moderated_at IS NULL ORDER BY id ASC LIMIT 50`,
  ).all<{ id: number; body: string }>()
  const rows = due.results ?? []
  const now = new Date().toISOString()
  let removed = 0
  for (const c of rows) {
    const v = await classify(c.body, env)
    if (v.flag) {
      await env.DB.prepare(
        `UPDATE comments SET status = 'removed', mod_reason = ?, moderated_at = ? WHERE id = ?`,
      )
        .bind(v.reason || 'failed moderation', now, c.id)
        .run()
      removed++
    } else {
      await env.DB.prepare(`UPDATE comments SET moderated_at = ? WHERE id = ?`).bind(now, c.id).run()
    }
  }
  return { checked: rows.length, removed }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}
