import type { Env } from './index'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verify a Cloudflare Turnstile token against the siteverify endpoint.
 * Returns true only when Cloudflare reports `success: true`. Returns false on an
 * empty token or any fetch/parse error (fail-closed).
 */
export async function verifyTurnstile(
  token: string,
  ip: string | null,
  env: Env,
): Promise<boolean> {
  if (!token) return false

  const body = new FormData()
  body.append('secret', env.TURNSTILE_SECRET)
  body.append('response', token)
  if (ip) body.append('remoteip', ip)

  try {
    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}
