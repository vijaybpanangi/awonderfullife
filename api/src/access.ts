import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from 'jose'
import type { Env } from './index'

const jwksCache = new Map<string, JWTVerifyGetKey>()

function remoteJwks(teamDomain: string): JWTVerifyGetKey {
  let jwks = jwksCache.get(teamDomain)
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`))
    jwksCache.set(teamDomain, jwks)
  }
  return jwks
}

/**
 * Verify a Cloudflare Access JWT and return its email claim.
 * `keys` is injectable: a single CryptoKey in tests, the remote JWKS resolver in production.
 */
export async function verifyAccessToken(
  token: string,
  opts: { keys: CryptoKey | JWTVerifyGetKey; issuer: string; audience: string },
): Promise<{ email: string }> {
  const options = { issuer: opts.issuer, audience: opts.audience }
  // jose's jwtVerify is overloaded (static key vs. getKey resolver); narrow on the
  // call style so the correct overload is selected.
  const { payload } =
    typeof opts.keys === 'function'
      ? await jwtVerify(token, opts.keys, options)
      : await jwtVerify(token, opts.keys, options)
  const email = payload.email
  if (typeof email !== 'string' || email.length === 0) {
    throw new Error('Access token is missing the email claim')
  }
  return { email }
}

/** Production entry point: read the Access header, verify against the team's remote JWKS. */
export async function getAccessEmail(request: Request, env: Env): Promise<string> {
  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!token) {
    throw new Error('Missing Cf-Access-Jwt-Assertion header')
  }
  const { email } = await verifyAccessToken(token, {
    keys: remoteJwks(env.ACCESS_TEAM_DOMAIN),
    issuer: `https://${env.ACCESS_TEAM_DOMAIN}`,
    audience: env.ACCESS_AUD,
  })
  return email
}
