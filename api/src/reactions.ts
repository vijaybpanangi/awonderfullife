// Zero-PII "appreciate" reactions: a per-post counter with a same-day abuse throttle keyed
// by a salted hash of (day, IP) — the raw IP is never stored or logged. No accounts.
import type { Env } from './index'

const SITE = 'https://awonderfullife.ca'
const SLUG_RE = /^[a-z0-9-]{1,120}$/
const DAILY_CAP = 10
// Non-secret fallback, used only if the REACTION_SALT Wrangler secret hasn't been set yet
// (e.g. right after this endpoint first deploys, before `wrangler secret put REACTION_SALT`
// runs). The throttle still works, just unsalted, until the real secret is in place.
const FALLBACK_SALT = 'awonderfullife-reactions-unsalted-fallback'

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
    Vary: 'Origin',
  }
}

function utcDate(nowMs: number = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10) // YYYY-MM-DD
}

// SHA-256(REACTION_SALT + ":" + UTC day + ":" + CF-Connecting-IP), hex. Opaque and
// non-reversible: nothing date- or IP-readable is ever persisted from this value.
// A missing CF-Connecting-IP (shouldn't happen on Cloudflare) falls back to a fixed
// sentinel so it still gets its own throttle bucket for the day.
async function dayHash(env: Env, ip: string | null, day: string): Promise<string> {
  const salt = env.REACTION_SALT || FALLBACK_SALT
  const bytes = new TextEncoder().encode(`${salt}:${day}:${ip ?? 'no-ip'}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Atomically bumps the (day_hash, slug) hit counter, capped at DAILY_CAP per UTC day.
// The SQLite UPSERT's WHERE clause makes the cap check and the increment a single
// statement: once hits reaches the cap, the DO UPDATE branch is skipped (a no-op —
// zero rows changed), which is how we detect "throttled" below.
async function bumpReactionEvent(env: Env, hash: string, slug: string, day: string): Promise<boolean> {
  const res = await env.DB.prepare(
    `INSERT INTO reaction_events (day_hash, slug, hits, day) VALUES (?, ?, 1, ?)
     ON CONFLICT(day_hash, slug) DO UPDATE SET hits = hits + 1 WHERE hits < ?`,
  )
    .bind(hash, slug, day, DAILY_CAP)
    .run()
  return (res.meta.changes ?? 0) > 0
}

async function currentCount(env: Env, slug: string): Promise<number> {
  const row = await env.DB.prepare(`SELECT count FROM reactions WHERE slug = ?`)
    .bind(slug)
    .first<{ count: number }>()
  return row?.count ?? 0
}

async function incrementCount(env: Env, slug: string): Promise<number> {
  const now = new Date().toISOString()
  const row = await env.DB.prepare(
    `INSERT INTO reactions (slug, count, updated_at) VALUES (?, 1, ?)
     ON CONFLICT(slug) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at
     RETURNING count`,
  )
    .bind(slug, now)
    .first<{ count: number }>()
  return row?.count ?? 0
}

// ---- public read ----
async function getReaction(slug: string, request: Request, env: Env): Promise<Response> {
  if (!SLUG_RE.test(slug)) return jc({ count: 0 }, 200, cors(request))
  return jc({ count: await currentCount(env, slug) }, 200, cors(request))
}

// ---- appreciate (increment, throttled) ----
async function postReaction(request: Request, env: Env): Promise<Response> {
  const c = cors(request)
  let b: Record<string, unknown>
  try {
    b = (await request.json()) as Record<string, unknown>
  } catch {
    return jc({ error: 'bad_request' }, 400, c)
  }
  const slug = typeof b.slug === 'string' ? b.slug : ''
  if (!SLUG_RE.test(slug)) return jc({ error: 'invalid' }, 400, c)

  const day = utcDate()
  const hash = await dayHash(env, request.headers.get('CF-Connecting-IP'), day)
  const allowed = await bumpReactionEvent(env, hash, slug, day)
  if (!allowed) {
    // Silent cap: current count, no error, no hint that a limit exists.
    return jc({ count: await currentCount(env, slug), throttled: true }, 200, c)
  }
  return jc({ count: await incrementCount(env, slug) }, 200, c)
}

export async function handleReactions(request: Request, env: Env): Promise<Response> {
  const { pathname, searchParams } = new URL(request.url)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request) })
  if (request.method === 'GET' && pathname === '/reactions') {
    return getReaction(searchParams.get('slug') ?? '', request, env)
  }
  if (request.method === 'POST' && pathname === '/reactions') {
    return postReaction(request, env)
  }
  return jc({ error: 'not_found' }, 404, cors(request))
}
