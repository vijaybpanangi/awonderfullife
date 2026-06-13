# API Spine — Foundation (Phase 1) — Design Spec

**Date:** 2026-06-13
**Status:** Approved (brainstorm with Vijay)
**Scope type:** New backend surface. A second, independent Cloudflare Worker added alongside the existing static-site worker. The live site (`awonderfullife.ca` / `www`) is not touched.

## Goal

Stand up the *spine* of awonderfullife.ca as a platform: a minimal, deployed Workers API at `api.awonderfullife.ca` with one public route and one private route gated by Cloudflare Access — proving compute + private gating + storage + deploy, end to end. Deliberately small. This is the only Phase 1 goal; lifestyle tools, the newsletter, and the blog-as-publication build on this spine later.

The acceptance test is the domain's own promise: the spine must *subtract* future friction (one backend that many surfaces plug into), never add a thing to check. Phase 1 ships nothing a visitor sees.

## Decisions made (with Vijay, in order)

1. **Cloudflare auth is ready** — the zone is on Vijay's personal Cloudflare account; Wrangler can authenticate. Wrangler is a project dev-dependency run via `npx`, not installed globally (the recommended pattern).
2. **Same repo, second worker** — the API lives in the existing public `awonderfullife` repo under `/api`, as an independent worker. One platform, one repo. *Rejected:* a separate `awonderfullife-api` repo (splits the platform across two repos); and extending the existing static-site worker (would put live-site delivery at risk).
3. **TypeScript on the native Workers runtime** — no framework in Phase 1 (two routes don't need one). A router is added later only if routes multiply.
4. **D1, trivial check only** — provision one D1 database + binding; the gated route runs `SELECT 1`. No application tables yet (the owned newsletter list is Phase 2). De-risks Phase 2, which is relational.
5. **Email deferred to Phase 2** — Resend, SPF/DKIM/DMARC, and the existing-list question are out of scope this session.

## Current state (verified)

- The **live site is already a Cloudflare Worker** using **Static Assets** — `wrangler.jsonc`: name `awonderfullife`, `assets.directory: "."`, `nodejs_compat`, observability on, **no `main` entrypoint** (pure assets today).
- **Deploy is push-to-`main` auto-deploy** via the Cloudflare↔GitHub integration (~30s). The repo is the deploy source. Custom domains `awonderfullife.ca` and `www.awonderfullife.ca` are both bound to this worker.
- Because `assets.directory` is `.`, **every committed file is publicly served** unless excluded in `.assetsignore`. The current `.assetsignore` excludes `.git`, `.wrangler`, `.superpowers`, dotenv files, and named docs/config — but **not** an `/api` directory or `node_modules`.
- **A newsletter already exists — on Buttondown** (the live form posts to `buttondown.email/.../awonderfullife`; `CLAUDE.md`: "don't change the action — it's the live mailing list endpoint"). The brief's "own the list in D1 + Resend" is therefore a Phase 2 *migration*, not greenfield capture.
- **`ROADMAP.md` plans the domain mailbox via iCloud+ Custom Email Domain** (inbound contact address + DMARC cleanup of stale WordPress-era SPF/DMARC) — distinct from Resend for outbound sends. Phase 2 email must reconcile both, plus the live Buttondown list.
- Tooling: Node v24.16, npm 11.13, git 2.50, `gh` authed as `vijaybpanangi`. No `pnpm`. No global Wrangler.
- Repo follows the brainstorm → spec → plan → execute convention (`docs/superpowers/specs|plans/`), with `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`. `CLAUDE.md` currently asserts "no build system / no package.json / no test framework" — true of the root; `/api` adds all three, scoped to itself.

## Design

### Topology

Two independent workers in one repo, one zone, two hostnames:

| Hostname | Worker | Source | Deploy |
|---|---|---|---|
| `awonderfullife.ca`, `www.` | `awonderfullife` (static assets) | repo root | push-to-`main` (unchanged) |
| `api.awonderfullife.ca` | `awonderfullife-api` (this work) | `/api` | `npx wrangler deploy` from `/api` |

The static worker is **not modified**. The API worker binds to `api.awonderfullife.ca` via a custom-domain route in its own `wrangler.jsonc`; `workers_dev` is disabled so it is reachable only via the custom domain (and `/admin*` only from behind Access).

### Routes (Phase 1: exactly two)

- **`GET /health`** — public. Returns `200 {"status":"ok","time":<iso>}`. No auth, no storage, no secrets. The end-to-end "is the spine up" probe.
- **`GET /admin/whoami`** — private, Access-gated. Returns `200 {"email":<verified>,"db":"ok"}`. Proves Access *and* D1 in one route: `email` comes from the verified Access identity; `db` reflects a `SELECT 1` against the D1 binding.
- Anything else → `404 {"error":"not_found"}`.

### Security

- **Cloudflare Access application** protecting `api.awonderfullife.ca/admin*`, policy allowing only Vijay's **personal** email (provided at setup — not assumed; the brief mandates personal-not-work accounts).
- **Defense in depth — the worker verifies the Access JWT itself.** On `/admin*` it reads the `Cf-Access-Jwt-Assertion` header, fetches the team's signing keys (`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, cached in-memory), and validates signature, expiry, and `aud` (the application AUD tag). A request without a valid token is rejected `403` — so the route is safe even if someone reaches the worker directly, bypassing the edge. Verification uses WebCrypto; no extra runtime dependency.
- **`workers_dev: false`** — no `*.workers.dev` bypass URL.
- **`.assetsignore` guard — lands in the same change as `/api`:** exclude `api`, `api/**`, and `node_modules` so API source is never served at `awonderfullife.ca/api/...`. This is the one cross-worker coupling in the design and is non-negotiable.
- **No secrets in code.** Phase 1 needs none in the worker: the Access team domain and AUD are non-secret config (`vars` in `wrangler.jsonc`); D1 is a binding. `.dev.vars` / `.env*` are already gitignored and asset-ignored. (Resend's API key arrives in Phase 2 as a Wrangler secret, never in `wrangler.jsonc`.)

### Storage

One D1 database (final name set in the plan; likely `awonderfullife-api`), bound to the API worker. **No application schema in Phase 1** — `/admin/whoami` issues `SELECT 1` purely to prove the binding deploys and answers. The newsletter schema, consent/delete rules, exports, and Time-Travel posture are Phase 2 design.

### Repo layout (added by Phase 1)

```
/api
  wrangler.jsonc      API worker config (name, main, custom-domain route, d1 binding, vars, workers_dev:false)
  package.json        wrangler + typescript + vitest + @cloudflare/vitest-pool-workers — scoped to /api
  tsconfig.json
  src/
    index.ts          fetch handler + route dispatch
    access.ts         Access JWT verification (JWKS fetch/cache; signature / aud / exp checks)
  test/
    health.test.ts    public health route
    access.test.ts    JWT verification: valid passes; expired / wrong-aud / unsigned fail
    whoami.test.ts    gated route returns verified email + db:"ok" (local D1)
/.assetsignore        (edited) add: api, api/**, node_modules
/CLAUDE.md            (edited) document the root(static) + /api(worker) split
```

### Testing (TDD)

Vitest with `@cloudflare/vitest-pool-workers` (tests run inside workerd with D1 available). Test-first for: the router (health `ok`; unknown route `404`), Access JWT verification (the pass/fail matrix above, using locally generated keypairs/tokens — no live network in tests), and `/admin/whoami` against a local D1.

### Deploy & process

- Work on branch **`feat/api-spine-foundation`** → PR. Never push straight to `main` (it auto-deploys the static site).
- API worker first deploy: `npx wrangler deploy` from `/api` (creates the worker, provisions `api.awonderfullife.ca` + cert, binds D1). The D1 database is created via `npx wrangler d1 create` and its id wired into `wrangler.jsonc`.
- The Access application + policy are created once in the Cloudflare Zero Trust dashboard (or via API) at setup; the AUD + team domain are copied into the worker's `vars`.
- **Merging the PR re-deploys the static site with no visible change** (no HTML/CSS/image edits; `/api` excluded from the asset bundle). The API worker is a separate deploy, not driven by the static worker's build.
- Wiring the API worker into its own Cloudflare Workers Build (push-to-`main` for `/api` too) is a documented **fast-follow**, not Phase 1.

## Definition of done

1. `curl https://api.awonderfullife.ca/health` → `200 {"status":"ok",...}`.
2. `GET https://api.awonderfullife.ca/admin/whoami` **without** Access → blocked at the edge / `403` from the worker; **with** Access → `200` returning Vijay's email and `db:"ok"`.
3. `awonderfullife.ca` and `www.awonderfullife.ca` still serve the live site, unchanged.
4. `npm test` in `/api` green. No secrets committed. `/api` and `node_modules` confirmed absent from the public asset bundle (not fetchable under `awonderfullife.ca/api/...`).
5. Spec, plan, `CLAUDE.md` update, `ROADMAP`/`CHANGELOG` touch, and `docs/conversation-log.md` committed.

## Out of scope (Phase 2+, parked)

- Turnstile and custom rate-limiting — Phase 1's only public route is a harmless health probe; Cloudflare's defaults suffice until the write-capable signup endpoint exists.
- Newsletter: D1 schema, consent/delete, export, Time Travel; **migration off the live Buttondown list**; Resend integration.
- Email: iCloud+ Custom Email Domain (mailbox), SPF/DKIM/DMARC cleanup.
- Lifestyle tools, blog-as-publication work, AI features, native apps, the free-but-sign-in tier.
- Wiring `/api` into its own Workers Build; any router/framework.

## Risks & notes

- **`.assetsignore` ordering is load-bearing.** If `/api` were committed before the `.assetsignore` exclusion, a static rebuild could publish API source. Both land in the same change; verified in the Definition of done.
- **Phase 2 has more existing state than the brief assumes** (live Buttondown list; iCloud+ email plan; WordPress-era DNS records). Recorded here so Phase 2 is designed against reality.
- **Access setup is partly manual** (dashboard application + policy). That is expected; the worker's JWT verification is the code half and is fully tested.
