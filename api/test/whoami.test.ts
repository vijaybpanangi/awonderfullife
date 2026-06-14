import { describe, it, expect } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { createWorker } from '../src/index'

function whoamiRequest() {
  return new Request('https://api.awonderfullife.ca/admin/whoami')
}

describe('GET /admin/whoami', () => {
  it('returns the verified email and db:"ok" when Access succeeds', async () => {
    const worker = createWorker({ getAccessEmail: async () => 'tester@example.com' })
    const ctx = createExecutionContext()
    const res = await worker.fetch(whoamiRequest(), env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ email: 'tester@example.com', db: 'ok' })
  })

  it('returns 403 when Access verification fails', async () => {
    const worker = createWorker({
      getAccessEmail: async () => {
        throw new Error('no token')
      },
    })
    const ctx = createExecutionContext()
    const res = await worker.fetch(whoamiRequest(), env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'forbidden' })
  })
})
