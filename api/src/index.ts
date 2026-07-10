import { getAccessEmail } from './access'
import { verifyTurnstile } from './turnstile'
import { runScheduledSend, purgeReactionEvents, defaultScheduledDeps, type ScheduledDeps } from './scheduled'
import { handleAdmin } from './admin'
import { handleComments, runCommentModeration } from './comments'
import { handleReactions } from './reactions'

export interface Env {
  DB: D1Database
  ACCESS_TEAM_DOMAIN: string
  ACCESS_AUD: string
  TURNSTILE_SECRET: string
  // Newsletter send (scheduled handler). Key is a Wrangler secret; from/reply-to are vars.
  RESEND_API_KEY?: string
  NEWSLETTER_FROM?: string
  NEWSLETTER_REPLY_TO?: string
  // Comments: AI binding for the moderation sweep; secret for signing verify sessions.
  AI?: Ai
  COMMENT_SECRET?: string
  // Reactions: salts the zero-PII day+IP abuse-throttle hash (src/reactions.ts). Wrangler
  // secret — see .dev.vars.example. If unset, POST /reactions fails loud (503 + console.warn);
  // GET /reactions still works (reads never need the salt).
  REACTION_SALT?: string
}

export interface Deps {
  getAccessEmail: (request: Request, env: Env) => Promise<string>
  verifyTurnstile: (token: string, ip: string | null, env: Env) => Promise<boolean>
}

const defaultDeps: Deps = { getAccessEmail, verifyTurnstile }

const ALLOWED_ORIGINS = new Set([
  'https://awonderfullife.ca',
  'https://www.awonderfullife.ca',
])

// Pragmatic email check: a single @, no spaces, a dotted domain, ≤254 chars.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function createWorker(
  overrides: Partial<Deps> = {},
  scheduledOverrides: Partial<ScheduledDeps> = {},
) {
  const deps: Deps = { ...defaultDeps, ...overrides }
  const scheduledDeps: ScheduledDeps = { ...defaultScheduledDeps, ...scheduledOverrides }
  return {
    // Broadcast tick (every 15 min). runScheduledSend sends any issue whose
    // per-issue scheduled_at has arrived.
    async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
      const result = await runScheduledSend(controller.scheduledTime, env, scheduledDeps)
      const mod = await runCommentModeration(env)
      const reactionsPurge = await purgeReactionEvents(env, controller.scheduledTime)
      console.log(
        `[scheduled] cron=${controller.cron} send=${JSON.stringify(result)} moderation=${JSON.stringify(mod)} reactions_purge=${JSON.stringify(reactionsPurge)}`,
      )
    },
    async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
      const { pathname, searchParams } = new URL(request.url)

      if (request.method === 'GET' && pathname === '/health') {
        return json({ status: 'ok', time: new Date().toISOString() })
      }

      if (request.method === 'GET' && pathname === '/admin/whoami') {
        let email: string
        try {
          email = await deps.getAccessEmail(request, env)
        } catch {
          return json({ error: 'forbidden' }, 403)
        }
        let db: 'ok' | 'error' = 'error'
        try {
          const row = await env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
          db = row?.ok === 1 ? 'ok' : 'error'
        } catch {
          db = 'error'
        }
        return json({ email, db })
      }

      // Compose UI + its JSON endpoints. Cloudflare Access gates /admin* at the edge;
      // we re-verify the Access JWT in-code (defense in depth) before any handler runs.
      if (pathname === '/admin/compose' || pathname.startsWith('/admin/issues')) {
        let email: string
        try {
          email = await deps.getAccessEmail(request, env)
        } catch {
          return json({ error: 'forbidden' }, 403)
        }
        return handleAdmin(request, env, email, scheduledDeps)
      }

      if (pathname === '/subscribe') {
        const cors = corsHeaders(request)
        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: cors })
        }
        if (request.method === 'POST') {
          return handleSubscribe(request, env, deps, cors)
        }
      }

      if (request.method === 'GET' && pathname === '/unsubscribe') {
        return handleUnsubscribe(searchParams.get('token'), env)
      }

      if (pathname === '/comments' || pathname === '/comments/verify') {
        return handleComments(request, env, deps, scheduledDeps.sendBatch)
      }

      if (pathname === '/reactions') {
        return handleReactions(request, env)
      }

      return json({ error: 'not_found' }, 404)
    },
  }
}

async function handleSubscribe(
  request: Request,
  env: Env,
  deps: Deps,
  cors: Record<string, string>,
): Promise<Response> {
  let email = ''
  let token = ''
  let source: string | null = null

  const contentType = request.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as {
        email?: unknown
        token?: unknown
        source?: unknown
      }
      email = typeof body.email === 'string' ? body.email : ''
      token = typeof body.token === 'string' ? body.token : ''
      source = typeof body.source === 'string' ? body.source : null
    } else {
      const form = await request.formData()
      email = String(form.get('email') ?? '')
      token = String(form.get('cf-turnstile-response') ?? form.get('token') ?? '')
      const formSource = form.get('source')
      source = typeof formSource === 'string' ? formSource : null
    }
  } catch {
    return json({ error: 'invalid_email' }, 400, cors)
  }

  email = email.trim().toLowerCase()
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: 'invalid_email' }, 400, cors)
  }

  const ok = await deps.verifyTurnstile(token, request.headers.get('CF-Connecting-IP'), env)
  if (!ok) {
    return json({ error: 'turnstile_failed' }, 403, cors)
  }

  const now = new Date().toISOString()
  const unsubToken = crypto.randomUUID()
  await env.DB.prepare(
    `INSERT INTO subscribers (email, status, consent_at, source, unsub_token, created_at)
     VALUES (?, 'active', ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET status = 'active', consent_at = excluded.consent_at`,
  )
    .bind(email, now, source, unsubToken, now)
    .run()

  return json({ status: 'ok' }, 200, cors)
}

async function handleUnsubscribe(token: string | null, env: Env): Promise<Response> {
  if (token) {
    try {
      await env.DB.prepare('DELETE FROM subscribers WHERE unsub_token = ?').bind(token).run()
    } catch {
      // Swallow — never leak whether the token existed or the query state.
    }
  }
  return new Response(UNSUB_HTML, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

const UNSUB_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribed — A Wonderful Life</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, "Manrope", sans-serif;
           color: #111; background: #fff; display: grid; place-items: center; min-height: 100vh; }
    main { max-width: 32rem; padding: 2rem; text-align: center; }
    h1 { font-size: 1.5rem; margin: 0 0 .5rem; }
    p { color: #666; line-height: 1.6; margin: 0; }
    a { color: #0a4a9a; }
  </style>
</head>
<body>
  <main>
    <h1>You've been unsubscribed.</h1>
    <p>You won't receive any more emails from A Wonderful Life. <a href="https://awonderfullife.ca">Return to the blog</a>.</p>
  </main>
</body>
</html>`

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

export default createWorker()

export function json(body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
  })
}
