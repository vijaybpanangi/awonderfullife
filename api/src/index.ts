import { getAccessEmail } from './access'

export interface Env {
  DB: D1Database
  ACCESS_TEAM_DOMAIN: string
  ACCESS_AUD: string
}

export interface Deps {
  getAccessEmail: (request: Request, env: Env) => Promise<string>
}

const defaultDeps: Deps = { getAccessEmail }

export function createWorker(deps: Deps = defaultDeps) {
  return {
    async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
      const { pathname } = new URL(request.url)

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

      return json({ error: 'not_found' }, 404)
    },
  }
}

export default createWorker()

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
