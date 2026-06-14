import { describe, it, expect } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import worker from '../src/index'

describe('GET /health', () => {
  it('returns 200 with status ok and a timestamp', async () => {
    const ctx = createExecutionContext()
    const res = await worker.fetch(new Request('https://api.awonderfullife.ca/health'), env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; time: string }
    expect(body.status).toBe('ok')
    expect(typeof body.time).toBe('string')
  })

  it('returns 404 for an unknown route', async () => {
    const ctx = createExecutionContext()
    const res = await worker.fetch(new Request('https://api.awonderfullife.ca/nope'), env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })
})
