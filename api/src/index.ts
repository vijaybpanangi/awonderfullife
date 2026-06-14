export interface Env {
  DB: D1Database
  ACCESS_TEAM_DOMAIN: string
  ACCESS_AUD: string
}

export function createWorker() {
  return {
    async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
      void env
      const { pathname } = new URL(request.url)

      if (request.method === 'GET' && pathname === '/health') {
        return json({ status: 'ok', time: new Date().toISOString() })
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
