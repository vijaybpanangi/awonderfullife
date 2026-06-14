# Conversation log

A timestamped journal of build sessions on awonderfullife.ca — the reasoning and the journey behind notable changes, refreshed each PR. The terse "what shipped" lives in `CHANGELOG.md`; this is the "how and why".

## 2026-06-13 — Phase 1: the API spine (`api.awonderfullife.ca`)

**Goal.** Stand up the backbone of the platform — a Workers API at `api.awonderfullife.ca` — without disturbing the live blog. The first slice of turning awonderfullife.ca from a static blog into a personal platform: *one backend, many faces*.

**What we found (ground truth before building).** The site was already a Cloudflare **Static-Assets Worker** (not Pages), auto-deploying on push to `main`, with `assets.directory: "."` — meaning *every committed file is publicly served unless `.assetsignore`-excluded*. Two things the original platform brief hadn't accounted for, now on record for Phase 2: the newsletter is **already live on Buttondown**, and `ROADMAP.md` plans the domain mailbox via **iCloud+**, not Resend. Both deferred deliberately.

**What we built.** A second, independent Worker under `/api` (TypeScript, no framework):
- `GET /health` — public.
- `GET /admin/whoami` — gated by **Cloudflare Access**, returning the verified email + a D1 `SELECT 1` check.
- Access is enforced at the edge **and** re-verified inside the worker (`jose`), so the route is safe even if hit directly — the "lock the data behind me" guardrail done properly.
- `workers_dev` off; Access config (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`) held as Wrangler **secrets**, never in this (public) repo; `.assetsignore` extended so `/api` source is never published as a static asset.
- Built test-first throughout — **9 Vitest tests** (router, the JWT-verification matrix, the gated route over a local D1).

**Two detours worth remembering.** The toolchain had moved past training-era knowledge, and both were resolved by reading the *installed package* rather than guessing:
1. `@cloudflare/vitest-pool-workers` **v4** dropped the `defineWorkersConfig` / `/config` helper — the integration is now a Vite plugin, `cloudflareTest({...})` + `defineConfig` from `vitest/config`. (Found in the package's own v3→v4 codemod source.)
2. In v4 the `cloudflare:test` ambient types live in the package's `./types` entry (referenced from `api/test/env.d.ts`), and `env` is typed `Cloudflare.Env`.

**Cloud setup (with Vijay, interactively).** `wrangler login` → `d1 create awonderfullife-api` → `wrangler deploy` (which provisioned the `api.awonderfullife.ca` custom domain + cert) → created the Cloudflare Access self-hosted app (`api.awonderfullife.ca/admin*`, policy = Vijay's personal email, one-time-PIN) → set the two secrets → verified live: `/health` `200`, `/admin/whoami` `302` unauthenticated and `{"email":"…","db":"ok"}` after the email-PIN sign-in. The apex + `www` blog stayed up throughout.

**Process.** Brainstorm → spec → plan → execute; TDD per step; one commit per green step; all on `feat/api-spine-foundation` → PR.
- Spec: `docs/superpowers/specs/2026-06-13-api-spine-foundation-design.md`
- Plan: `docs/superpowers/plans/2026-06-13-api-spine-foundation.md`

**Deferred (Phase 2+).** Newsletter migration off Buttondown to D1 + Resend (Turnstile + rate limiting); email/SPF/DKIM/DMARC reconciliation (iCloud+ mailbox + Resend sends); client-side lifestyle tools; wiring `/api` into its own Workers Build.
