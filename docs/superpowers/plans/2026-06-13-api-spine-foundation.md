# API Spine — Foundation (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a deployed Workers API at `api.awonderfullife.ca` with one public route (`/health`) and one Cloudflare-Access-gated route (`/admin/whoami`) that proves Access + D1 together — as a second, independent Worker in this repo, without touching the live static site.

**Architecture:** A new worker under `/api`, written in TypeScript on the native Workers runtime (no framework). Access JWT verification uses `jose` (WebCrypto, zero-dependency) and is structured for dependency injection so the route logic is testable without network. The existing static-site worker at the repo root is unmodified; `.assetsignore` is extended so `/api` source is never published as a public asset.

**Tech Stack:** Cloudflare Workers + Wrangler 4.100, TypeScript 6, Vitest 4.1 with `@cloudflare/vitest-pool-workers` 0.16 (runs tests in workerd with local D1), `jose` 6 for JWT verification, Cloudflare D1, Cloudflare Access.

> **Spec refinement to confirm at review:** the design spec said "WebCrypto, no extra runtime dependency." This plan uses `jose` (a tiny, audited, zero-dependency JWT primitive that runs on WebCrypto) rather than hand-rolling RS256/JWKS verification — hand-rolled JWT crypto is an unnecessary security risk. `jose` is a focused primitive, not a framework, so it preserves the spec's minimalism intent.

> **Privacy note:** this repo is **public**. Vijay's personal Gmail (given during planning) is entered only into the Cloudflare Access policy and never written into any committed file. Where the plan says "Vijay's personal Gmail," use that address; do not paste it into the repo.

---

## File structure

| File | Responsibility |
|---|---|
| `api/package.json` | Worker package + scripts (`dev`, `deploy`, `test`, `typecheck`) + pinned deps |
| `api/tsconfig.json` | TypeScript config (strict, Workers types) |
| `api/vitest.config.ts` | Vitest + Workers pool, reads `wrangler.jsonc` for bindings |
| `api/wrangler.jsonc` | Worker config: name, `main`, custom-domain route, D1 binding, `workers_dev:false` |
| `api/.gitignore` | Ignore `node_modules`, `dist`, local wrangler/dev-vars inside `/api` |
| `api/.dev.vars.example` | Documents the local env var names (no values) |
| `api/src/index.ts` | `fetch` handler + route dispatch + `json()` helper + `Env`/`Deps` types + `createWorker()` factory |
| `api/src/access.ts` | `verifyAccessToken()` (pure, injectable keys) + `getAccessEmail()` (prod wrapper, remote JWKS) |
| `api/test/env.d.ts` | Types the `cloudflare:test` env as `Env` |
| `api/test/health.test.ts` | `/health` 200 + unknown route 404 |
| `api/test/access.test.ts` | JWT verification matrix (valid / wrong-aud / expired / forged / no-email) |
| `api/test/whoami.test.ts` | `/admin/whoami` returns email + `db:"ok"`; 403 when Access fails |
| `.assetsignore` (root, **modified**) | Exclude `api`, `api/**`, `node_modules` from the public asset bundle |
| `CLAUDE.md` (root, **modified**) | Document the root(static) + `/api`(worker) split |
| `ROADMAP.md` (root, **modified**) | Record Phase-1 fast-follows + Phase-2 reality notes |
| `CHANGELOG.md` (root, **modified**) | Log the API-spine infrastructure change |
| `docs/conversation-log.md` (**created**) | Beautiful timestamped build journal (per SOP) |
| `docs/superpowers/README.md` (**modified**) | List this spec + plan under "Existing documents" |

---

## Task 1: Scaffold the `/api` worker project

**Files:**
- Create: `api/package.json`, `api/tsconfig.json`, `api/vitest.config.ts`, `api/wrangler.jsonc`, `api/.gitignore`, `api/.dev.vars.example`, `api/src/index.ts`, `api/test/env.d.ts`
- Modify: `.assetsignore` (repo root)

- [ ] **Step 1: Create `api/package.json`**

```json
{
  "name": "awonderfullife-api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "jose": "^6.2.3"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.16.15",
    "@cloudflare/workers-types": "^4.20260613.1",
    "typescript": "^6.0.3",
    "vitest": "4.1.8",
    "wrangler": "^4.100.0"
  }
}
```

- [ ] **Step 2: Create `api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["es2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `api/vitest.config.ts`**

```ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
      },
    },
  },
})
```

- [ ] **Step 4: Create `api/wrangler.jsonc`** (the `database_id` is a placeholder replaced in Task 5; local tests do not use it)

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "awonderfullife-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-06-13",
  "observability": { "enabled": true },
  "workers_dev": false,
  "routes": [
    { "pattern": "api.awonderfullife.ca", "custom_domain": true }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "awonderfullife-api",
      "database_id": "REPLACE_AFTER_D1_CREATE"
    }
  ]
}
```

- [ ] **Step 5: Create `api/.gitignore`**

```gitignore
node_modules/
dist/
.wrangler/
.dev.vars
*.log
```

- [ ] **Step 6: Create `api/.dev.vars.example`** (names only — never commit real values)

```sh
# Local-only values for `wrangler dev`. Copy to `api/.dev.vars` (gitignored) and fill in.
# In production these are Wrangler secrets (set via `wrangler secret put`), not committed.
ACCESS_TEAM_DOMAIN="your-team.cloudflareaccess.com"
ACCESS_AUD="your-access-application-audience-tag"
```

- [ ] **Step 7: Create `api/src/index.ts`** (minimal stub — returns 404 for everything; routes are added by later tasks)

```ts
export interface Env {
  DB: D1Database
  ACCESS_TEAM_DOMAIN: string
  ACCESS_AUD: string
}

export function createWorker() {
  return {
    async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
      void request
      void env
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
```

- [ ] **Step 8: Create `api/test/env.d.ts`** (types the test `env` as our `Env`)

```ts
/// <reference types="@cloudflare/vitest-pool-workers" />
import type { Env } from '../src/index'

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}
```

- [ ] **Step 9: Extend the root `.assetsignore`** so `/api` is never served as a public asset

Append these lines to the existing `.assetsignore` (do not remove existing lines):

```gitignore

# API worker — a separate Cloudflare Worker (api.awonderfullife.ca), never a static asset of the site.
api
api/**
node_modules
node_modules/**
```

- [ ] **Step 10: Install dependencies**

Run: `cd api && npm install`
Expected: creates `api/node_modules` and `api/package-lock.json`; exits 0 with no peer-dependency errors (vitest 4.1.8 satisfies the pool's `vitest ^4.1.0` peer).

- [ ] **Step 11: Typecheck the stub**

Run: `cd api && npm run typecheck`
Expected: exits 0, no type errors.

- [ ] **Step 12: Commit**

```bash
cd /Volumes/Vijay/Projects/awonderfullife
git add api .assetsignore
git commit -m "feat(api): scaffold awonderfullife-api worker (TS + vitest pool + D1 binding)"
```

---

## Task 2: Public `/health` route (TDD)

**Files:**
- Test: `api/test/health.test.ts`
- Modify: `api/src/index.ts`

- [ ] **Step 1: Write the failing test** — create `api/test/health.test.ts`

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd api && npx vitest run test/health.test.ts`
Expected: the `/health` test FAILS (stub returns 404, so `res.status` is 404 not 200). The unknown-route test passes.

- [ ] **Step 3: Implement the `/health` route** — edit `api/src/index.ts`, replacing the body of `fetch` so it reads:

```ts
    async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
      void env
      const { pathname } = new URL(request.url)

      if (request.method === 'GET' && pathname === '/health') {
        return json({ status: 'ok', time: new Date().toISOString() })
      }

      return json({ error: 'not_found' }, 404)
    },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd api && npx vitest run test/health.test.ts`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/Vijay/Projects/awonderfullife
git add api/src/index.ts api/test/health.test.ts
git commit -m "feat(api): public GET /health route"
```

---

## Task 3: Access JWT verification module (TDD)

**Files:**
- Test: `api/test/access.test.ts`
- Create: `api/src/access.ts`

- [ ] **Step 1: Write the failing test** — create `api/test/access.test.ts`

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd api && npx vitest run test/access.test.ts`
Expected: FAIL — `verifyAccessToken` is not defined / `../src/access` cannot be resolved.

- [ ] **Step 3: Implement `api/src/access.ts`**

```ts
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
  const { payload } = await jwtVerify(token, opts.keys, {
    issuer: opts.issuer,
    audience: opts.audience,
  })
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd api && npx vitest run test/access.test.ts`
Expected: all five tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/Vijay/Projects/awonderfullife
git add api/src/access.ts api/test/access.test.ts
git commit -m "feat(api): Cloudflare Access JWT verification (jose, injectable keys)"
```

---

## Task 4: Access-gated `/admin/whoami` route with D1 check (TDD)

**Files:**
- Test: `api/test/whoami.test.ts`
- Modify: `api/src/index.ts`

- [ ] **Step 1: Write the failing test** — create `api/test/whoami.test.ts`

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd api && npx vitest run test/whoami.test.ts`
Expected: FAIL — `createWorker` does not accept a `deps` argument yet, and `/admin/whoami` returns 404 (so status is 404, not 200/403).

- [ ] **Step 3: Implement the gated route** — replace the entire contents of `api/src/index.ts` with:

```ts
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
```

- [ ] **Step 4: Run the full test suite to verify everything passes**

Run: `cd api && npm test`
Expected: all tests across `health.test.ts`, `access.test.ts`, and `whoami.test.ts` PASS. (`whoami` uses the Workers pool's local D1 for `SELECT 1 AS ok`.)

- [ ] **Step 5: Typecheck**

Run: `cd api && npm run typecheck`
Expected: exits 0, no type errors.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/Vijay/Projects/awonderfullife
git add api/src/index.ts api/test/whoami.test.ts
git commit -m "feat(api): Access-gated GET /admin/whoami with D1 connectivity check"
```

---

## Task 5: Provision cloud resources, configure Access, deploy, and verify live

> This is the only task that mutates cloud state. Do it interactively. The Access-application steps are manual (Cloudflare Zero Trust dashboard). Run from the `feat/api-spine-foundation` branch.

**Files:**
- Modify: `api/wrangler.jsonc` (real `database_id`)

- [ ] **Step 1: Confirm the authenticated Cloudflare account**

Run: `cd api && npx wrangler whoami`
Expected: shows Vijay's **personal** Cloudflare account and the `awonderfullife.ca` zone. If it shows a work account, stop and re-auth (`npx wrangler login`) — the brief mandates personal infrastructure.

- [ ] **Step 2: Create the D1 database**

Run: `cd api && npx wrangler d1 create awonderfullife-api`
Expected: prints a `database_id` (a UUID). Copy it.

- [ ] **Step 3: Wire the real `database_id` into `api/wrangler.jsonc`**

Replace `"REPLACE_AFTER_D1_CREATE"` with the UUID printed in Step 2.

- [ ] **Step 4: Deploy the API worker**

Run: `cd api && npx wrangler deploy`
Expected: deploys `awonderfullife-api` and provisions the `api.awonderfullife.ca` custom domain (Wrangler creates the DNS record + certificate). First-time cert issuance can take a minute or two.

- [ ] **Step 5: Verify the public health route live**

Run: `curl -s https://api.awonderfullife.ca/health`
Expected: `{"status":"ok","time":"<iso timestamp>"}`. (If you get a TLS/525/522 error immediately after deploy, wait ~60s for the cert and retry.)

- [ ] **Step 6: Create the Cloudflare Access application (manual — Zero Trust dashboard)**

In the Cloudflare dashboard → **Zero Trust → Access → Applications → Add an application → Self-hosted**:
- **Application name:** `awonderfullife API admin`
- **Session duration:** default (e.g. 24h)
- **Application domain:** subdomain `api`, domain `awonderfullife.ca`, **path** `admin` (protects `api.awonderfullife.ca/admin*`)
- **Identity providers:** ensure **One-time PIN** is enabled (lets you authenticate via email PIN)
- Add a **policy**: Action **Allow**; Include → **Emails** → **Vijay's personal Gmail** (the address given during planning — do not write it into the repo)
- Save the application, then open it and copy the **Application Audience (AUD) Tag** (a 64-char hex string).
- Note your **team domain**: Zero Trust → **Settings → Custom Pages** (or **Settings → General**) shows it as `<team-name>.cloudflareaccess.com`.

- [ ] **Step 7: Set the worker's Access config as Wrangler secrets** (kept out of the public repo)

```bash
cd api
npx wrangler secret put ACCESS_TEAM_DOMAIN   # paste: <team-name>.cloudflareaccess.com
npx wrangler secret put ACCESS_AUD           # paste: the AUD tag from Step 6
```
Expected: each command confirms the secret was created/updated on `awonderfullife-api`. Secrets apply to the live worker immediately.

- [ ] **Step 8: Verify the gated route is blocked when unauthenticated**

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://api.awonderfullife.ca/admin/whoami`
Expected: `302` (Access intercepts at the edge and redirects to the login page) — i.e. the request never reaches the worker unauthenticated.

- [ ] **Step 9: Verify the gated route when authenticated (browser)**

Open `https://api.awonderfullife.ca/admin/whoami` in a browser, complete the One-time PIN sent to Vijay's personal Gmail.
Expected: JSON `{"email":"<vijay's personal gmail>","db":"ok"}`. This confirms Access identity reaches the worker, the JWT verifies, and D1 answers.

- [ ] **Step 10: Confirm the live site is unaffected**

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://awonderfullife.ca`
Expected: `200` — the static site still serves (it is a different worker on the apex; this change never touched it).

- [ ] **Step 11: Commit the real database id**

```bash
cd /Volumes/Vijay/Projects/awonderfullife
git add api/wrangler.jsonc
git commit -m "chore(api): wire D1 database id for awonderfullife-api"
```

---

## Task 6: Documentation, conversation log, and PR

**Files:**
- Modify: `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`, `docs/superpowers/README.md`
- Create: `docs/conversation-log.md`

- [ ] **Step 1: Document the API worker in `CLAUDE.md`** — append this section after the existing "Build, run, deploy" section:

```markdown
## The API worker (`/api`)

The repo now hosts a **second, independent Cloudflare Worker** alongside the static site.

- **Static site (repo root):** still no build system — plain HTML/CSS, `assets.directory: "."`, auto-deploys from `main`.
- **API worker (`/api`):** TypeScript on the Workers runtime, with its own `package.json`, `wrangler.jsonc`, and Vitest tests. Lives at **`api.awonderfullife.ca`**; the static site is untouched.

**Routes:** `GET /health` (public) and `GET /admin/whoami` (gated by Cloudflare Access; returns the verified email + a D1 connectivity flag).

**Security:** Access protects `api.awonderfullife.ca/admin*`; the worker *also* verifies the Access JWT in-code (`src/access.ts`, via `jose`). `workers_dev` is disabled. `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are Wrangler **secrets**, not committed. The root `.assetsignore` excludes `api` + `node_modules` so API source is never served at `awonderfullife.ca/...`.

**Work in `/api`:**
- Test: `cd api && npm test`
- Typecheck: `cd api && npm run typecheck`
- Local dev: `cd api && npm run dev` (needs `api/.dev.vars` — copy from `.dev.vars.example`)
- Deploy: `cd api && npm run deploy` (manual; the API worker is **not** wired into the static site's push-to-main build — see ROADMAP)
```

- [ ] **Step 2: Record fast-follows + Phase-2 reality in `ROADMAP.md`** — add these entries under a new top section (after the intro, before "India-and-Pakistan hero regeneration"):

```markdown
## Platform API (`api.awonderfullife.ca`)

The Phase-1 spine shipped 2026-06-13 (see `CHANGELOG.md` and `docs/superpowers/specs/2026-06-13-api-spine-foundation-design.md`): a second Worker with a public `/health` route and an Access-gated `/admin/whoami` route over D1. Fast-follows and the deferred Phase-2 work:

- **Wire `/api` into its own Cloudflare Workers Build** so it auto-deploys on push to `main` (today it deploys manually via `wrangler deploy`).
- **Phase 2 — newsletter, owned:** migrate the live **Buttondown** list (the homepage form currently posts to Buttondown) to a self-owned **D1** list with **Resend** for sends, behind Turnstile + rate limiting. Capture only email + consent timestamp; unsubscribe deletes.
- **Phase 2 — email reconciliation:** the brief assumed Resend for sending; this ROADMAP separately plans **iCloud+ Custom Email Domain** for the inbound mailbox. Design SPF/DKIM/DMARC to authorize both senders (iCloud for mailbox, Resend for newsletter) while cleaning up the stale WordPress-era records.
```

- [ ] **Step 3: Log the change in `CHANGELOG.md`** — add this row at the top of the "Recent updates"-style table (match the existing date/area/what format):

```markdown
| 2026-06-13 | Infrastructure | API spine (Phase 1): new `awonderfullife-api` Worker at `api.awonderfullife.ca` — public `/health`, Access-gated `/admin/whoami` over D1, in-worker Access JWT verification (`jose`). Static site untouched; `.assetsignore` extended to exclude `/api`. |
```

- [ ] **Step 4: List the new docs in `docs/superpowers/README.md`** — add under "Existing documents":

```markdown
- `specs/2026-06-13-api-spine-foundation-design.md` — the Phase-1 platform-spine design (the API worker, Access gating, D1).
- `plans/2026-06-13-api-spine-foundation.md` — the task-by-task plan that built the spine.
```

- [ ] **Step 5: Create `docs/conversation-log.md`** (per the build-journal SOP)

```markdown
# Conversation log

A timestamped journal of build sessions on awonderfullife.ca — the reasoning behind notable changes, refreshed each PR.

## 2026-06-13 — Phase 1: the API spine

**Goal:** stand up the platform backend — a Workers API at `api.awonderfullife.ca` — without disturbing the live blog.

**What we found:** the site was already a Cloudflare **Static-Assets Worker** (not Pages), auto-deploying on push to `main`, with `assets.directory: "."` (so every committed file is public unless `.assetsignore`-excluded). The newsletter is already live on **Buttondown**, and `ROADMAP.md` plans the domain mailbox via **iCloud+** — both noted as Phase-2 realities the original brief didn't account for.

**What we built:** a second, independent Worker under `/api` (TypeScript, no framework). One public route (`/health`) and one Cloudflare-Access-gated route (`/admin/whoami`) that returns the verified email + a D1 `SELECT 1` check. Access is enforced at the edge *and* re-verified in the worker via `jose` (defence in depth). `workers_dev` disabled; Access config held as Wrangler secrets; `.assetsignore` extended so `/api` source is never published. TDD throughout (router, JWT-verification matrix, gated route over local D1).

**Deferred (Phase 2+):** newsletter migration off Buttondown to D1 + Resend; email/SPF/DKIM/DMARC reconciliation; Turnstile + rate limiting; wiring `/api` into its own Workers Build.
```

- [ ] **Step 6: Commit the docs**

```bash
cd /Volumes/Vijay/Projects/awonderfullife
git add CLAUDE.md ROADMAP.md CHANGELOG.md docs/superpowers/README.md docs/conversation-log.md
git commit -m "docs: record the Phase-1 API spine (CLAUDE/ROADMAP/CHANGELOG + conversation log)"
```

- [ ] **Step 7: Push the branch and open a PR**

```bash
cd /Volumes/Vijay/Projects/awonderfullife
git push -u origin feat/api-spine-foundation
gh pr create --base main --head feat/api-spine-foundation \
  --title "Phase 1: API spine (api.awonderfullife.ca)" \
  --body "$(cat <<'BODY'
## Summary
Stands up the platform backend: a second, independent Cloudflare Worker (`awonderfullife-api`) at `api.awonderfullife.ca`. The live static site is untouched.

- Public `GET /health`.
- Access-gated `GET /admin/whoami` → verified email + D1 connectivity (`SELECT 1`).
- In-worker Access JWT verification (`jose`) on top of edge Access — defence in depth.
- `workers_dev:false`; Access config as Wrangler secrets (not committed).
- `.assetsignore` extended to exclude `/api` + `node_modules` so API source is never served publicly.

Spec: `docs/superpowers/specs/2026-06-13-api-spine-foundation-design.md`
Plan: `docs/superpowers/plans/2026-06-13-api-spine-foundation.md`

## Deploy notes
- The API worker is deployed separately (`cd api && npm run deploy`); it is **not** driven by the static site's push-to-main build.
- **Merging this PR re-deploys the static site** (Workers Build on `main`) **with no visible change** — `/api` is excluded from the asset bundle.

## Test plan
- `cd api && npm test` — green (router, JWT-verification matrix, gated route over local D1).
- Live: `/health` → 200; `/admin/whoami` → 302 unauthenticated, JSON `{email, db:"ok"}` after Access PIN; `awonderfullife.ca` unchanged.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

Expected: PR created against `main`. Do not merge automatically — Vijay reviews and merges.

- [ ] **Step 8: Post-merge verification (after Vijay merges the PR)**

Once `main` has rebuilt (~30s), confirm the `.assetsignore` guard works on the live site:

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://awonderfullife.ca/api/src/index.ts`
Expected: `404` — API source is **not** served as a public asset.

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://awonderfullife.ca`
Expected: `200` — site still live.

---

## Definition of done (maps to the spec)

1. `curl https://api.awonderfullife.ca/health` → `200 {"status":"ok",...}` — Task 5 Step 5.
2. `GET /admin/whoami` → blocked unauthenticated; authenticated → email + `db:"ok"` — Task 5 Steps 8–9.
3. `awonderfullife.ca` + `www` unchanged — Task 5 Step 10, Task 6 Step 8.
4. `npm test` green; no secrets committed; `/api` not served as a public asset — Task 4 Step 4, Task 5 Step 7, Task 6 Step 8.
5. Spec + plan + `CLAUDE.md`/`ROADMAP`/`CHANGELOG` + `docs/conversation-log.md` committed; PR opened — Task 6.
