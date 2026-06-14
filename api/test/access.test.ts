import { describe, it, expect, beforeAll } from 'vitest'
import { generateKeyPair, SignJWT } from 'jose'
import { verifyAccessToken } from '../src/access'

const ISSUER = 'https://testteam.cloudflareaccess.com'
const AUD = 'test-audience-tag'
const EMAIL = 'tester@example.com'

let publicKey: CryptoKey
let privateKey: CryptoKey

beforeAll(async () => {
  const pair = await generateKeyPair('RS256')
  publicKey = pair.publicKey
  privateKey = pair.privateKey
})

async function sign(
  opts: { issuer?: string; audience?: string; expSecondsFromNow?: number; includeEmail?: boolean } = {},
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: Record<string, unknown> = {}
  if (opts.includeEmail !== false) payload.email = EMAIL
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now)
    .setIssuer(opts.issuer ?? ISSUER)
    .setAudience(opts.audience ?? AUD)
    .setExpirationTime(now + (opts.expSecondsFromNow ?? 3600))
    .sign(privateKey)
}

describe('verifyAccessToken', () => {
  it('accepts a valid token and returns the email', async () => {
    const token = await sign()
    await expect(
      verifyAccessToken(token, { keys: publicKey, issuer: ISSUER, audience: AUD }),
    ).resolves.toEqual({ email: EMAIL })
  })

  it('rejects a token with the wrong audience', async () => {
    const token = await sign({ audience: 'some-other-app' })
    await expect(
      verifyAccessToken(token, { keys: publicKey, issuer: ISSUER, audience: AUD }),
    ).rejects.toThrow()
  })

  it('rejects an expired token', async () => {
    const token = await sign({ expSecondsFromNow: -60 })
    await expect(
      verifyAccessToken(token, { keys: publicKey, issuer: ISSUER, audience: AUD }),
    ).rejects.toThrow()
  })

  it('rejects a token signed by a different key (forged)', async () => {
    const other = await generateKeyPair('RS256')
    const forged = await new SignJWT({ email: EMAIL })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUD)
      .setExpirationTime('1h')
      .sign(other.privateKey)
    await expect(
      verifyAccessToken(forged, { keys: publicKey, issuer: ISSUER, audience: AUD }),
    ).rejects.toThrow()
  })

  it('rejects a valid signature that is missing the email claim', async () => {
    const token = await sign({ includeEmail: false })
    await expect(
      verifyAccessToken(token, { keys: publicKey, issuer: ISSUER, audience: AUD }),
    ).rejects.toThrow(/email/i)
  })
})
