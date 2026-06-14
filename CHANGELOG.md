# Changelog

Notable changes to the website, deployment configuration, and project documentation. The detailed history lives in git; this file curates the highlights so a casual reader can scan what's happened over time without scrolling commit logs.

Releases on this project use semver-style tags (`v1.0.0`, `v1.1.0`, etc.) cut as deliberate milestones, not per-commit. See [GitHub Releases](https://github.com/vijaybpanangi/awonderfullife/releases) for the formal release notes.

## 2026-06-13 — API spine (Phase 1): `api.awonderfullife.ca`

The first piece of the platform backend. A **second, independent Cloudflare Worker** (`awonderfullife-api`) now runs at **`api.awonderfullife.ca`**, alongside the static blog — which is untouched. This begins turning awonderfullife.ca from a static blog into a personal platform ("one backend, many faces"). Spec at `docs/superpowers/specs/2026-06-13-api-spine-foundation-design.md`; plan at `docs/superpowers/plans/2026-06-13-api-spine-foundation.md`.

### What shipped

- **`GET /health`** — public liveness probe (`{status:"ok", time}`).
- **`GET /admin/whoami`** — gated by **Cloudflare Access** (`api.awonderfullife.ca/admin*`, policy = Vijay's personal email); returns the verified email + a **D1** connectivity flag (`SELECT 1`).
- **Defence in depth:** the worker independently verifies the Access JWT (`src/access.ts`, via `jose` over WebCrypto) — safe even if reached directly. `workers_dev` disabled.
- **TypeScript** on the Workers runtime, no framework; **Vitest** (`@cloudflare/vitest-pool-workers`) with **9 passing tests** (router, JWT-verification matrix, gated route over a local D1).
- **D1** database `awonderfullife-api` bound as `DB` — no application schema yet (that's Phase 2's owned newsletter list).
- **Secrets** (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`) live as Wrangler secrets, never in the repo. `.assetsignore` extended to keep `/api` source out of the public asset bundle.

### Deploy model

The API worker deploys **manually** (`cd api && npm run deploy`); it is not part of the static site's push-to-`main` build. Wiring it into its own Workers Build is tracked in `ROADMAP.md`.

---

## 2026-06-11 — Quiet Magazine redesign + generated illustration series

A full visual redesign of the site, shipped on branch `redesign/quiet-magazine` (PR: Quiet Magazine redesign + generated illustration series). The centerpiece is replacing all 16 Picsum stand-in heroes with a cohesive AI-generated editorial-illustration series, while simultaneously overhauling the homepage, category pages, and single-post layout. Spec at `docs/superpowers/specs/2026-06-11-quiet-magazine-redesign-design.md`; implementation plan at `docs/superpowers/plans/`; image manifest (all 16 images with seeds, prompts, and alt texts) at `docs/superpowers/specs/2026-06-11-image-manifest.md`.

### Design

- **Homepage rebuilt** as a featured opener (first post at full width with illustration) + a 2-column illustrated card grid for the remaining 15 posts.
- **Category pages** converted from plain archive lists to illustrated card grids — faceted browsing strip preserved.
- **Single posts:** display-scale titles (`clamp(2.2rem, 5vw, 3.2rem)`), breakout heroes (a `--breakout` clamp() on `.post-hero` lets the image bleed beyond the 800px text column), `· N MIN READ` bylines (reading time statically computed as words ÷ 200), and prev/next footer navigation.
- **About page:** author photo switched from round portrait to editorial 180×180px square frame.
- **Body text** scaled from 17px to 18px equivalent (1.125rem).
- **Dead thumbnail-list CSS pruned** — `.post-item`, `.post-thumb`, and related rules removed.
- Stylesheet grew from 421 lines to **480 lines** with new components: `.featured`, `.card-grid`, `.post-nav`, `.container--wide`, breakout hero rules.

### Illustration series

- **All 16 Picsum stand-ins replaced** with a cohesive AI-generated editorial-illustration series produced via Cloudflare Workers AI `flux-1-schnell` (free tier) using the script at `docs/superpowers/tools/gen-hero.sh`.
- Flat editorial style, terracotta/slate-blue/cream palette, consistent across all 16 images.
- Every image individually viewed and QC'd; several regenerated for style, quality, or series cohesion.
- People-posts (Ratan Tata, Trump vs Harris, India & Pakistan) use **symbolic no-likeness scenes** — no faces.
- Full manifest with seeds, prompts, alt texts, and file sizes: `docs/superpowers/specs/2026-06-11-image-manifest.md`.
- Total hero image payload: **1.5MB for 16 images**.
- **Alt text rewritten per image** — describes the illustration content rather than restating the post title. Closes the *Alt text simplification* ROADMAP item.

### Known follow-up

- **India-and-Pakistan hero regeneration.** The image passed QC and the gallery review rated it weakest for series cohesion. It will be regenerated for stronger cohesion in a follow-up PR once the Workers AI daily free quota resets.

---

## 2026-05-28

### 🏷 Release: `v1.0.0` — Editorial direction launch

First formal release. Marks the current state of the project as a stable milestone after the May 2026 redesign, the post-body cleanup, the infrastructure work (www custom domain, `.assetsignore`), and the full documentation surface (README, CLAUDE.md, CHANGELOG, ROADMAP, 12-page Wiki). Full release notes at <https://github.com/vijaybpanangi/awonderfullife/releases/tag/v1.0.0>.

### GitHub Wiki

- **Initial signpost page added.** A minimal `Home` page was created on the repo's GitHub Wiki tab as a way-finder pointing visitors back to the canonical in-repo docs.
- **Full multi-page Wiki built out.** Expanded into a navigable twelve-page wiki with a sidebar. Pages: [Home](https://github.com/vijaybpanangi/awonderfullife/wiki), [About the Blog](https://github.com/vijaybpanangi/awonderfullife/wiki/About-the-Blog), [The Five Categories](https://github.com/vijaybpanangi/awonderfullife/wiki/The-Five-Categories), [Post Catalog](https://github.com/vijaybpanangi/awonderfullife/wiki/Post-Catalog), [Site Architecture](https://github.com/vijaybpanangi/awonderfullife/wiki/Site-Architecture), [Design System](https://github.com/vijaybpanangi/awonderfullife/wiki/Design-System), [Adding a Post](https://github.com/vijaybpanangi/awonderfullife/wiki/Adding-a-Post), [Hero Photography](https://github.com/vijaybpanangi/awonderfullife/wiki/Hero-Photography), [Deployment](https://github.com/vijaybpanangi/awonderfullife/wiki/Deployment), [The May 2026 Redesign](https://github.com/vijaybpanangi/awonderfullife/wiki/The-May-2026-Redesign), [Roadmap](https://github.com/vijaybpanangi/awonderfullife/wiki/Roadmap), [AI-Assisted Development](https://github.com/vijaybpanangi/awonderfullife/wiki/AI-Assisted-Development). Repo files remain canonical; the Wiki is long-form narrative and reference material that wouldn't fit in the repo without bloating it.

### Infrastructure

- **`www.awonderfullife.ca` now resolves.** Added as a second Custom Domain on the Cloudflare Worker. Previously the `www` subdomain returned HTTP 522 (Cloudflare reached an origin that wasn't responding); now both apex and `www` serve identical content from the same Worker.
- **Stale DNS record removed.** Deleted a lingering `CNAME` record for `www.awonderfullife.ca` that was the root cause of the 522. It was a leftover from earlier domain setup and pointed at an origin that no longer existed. With it gone, the new Custom Domain mapping could be claimed.

### Documentation

- **`README.md`** — public-facing project overview for anyone landing on the GitHub repo home (tagline, live URL, what the blog is, the five categories, tech stack, how to preview/deploy, the three-places rule for adding a post).
- **`CLAUDE.md`** — operator's manual for Claude Code sessions working in this repo: architecture, file structure, kicker and faceted-nav patterns, the post-body cleanup history, deferred follow-ups.
- **`docs/superpowers/README.md`** — explains the brainstorm → spec → plan → execute workflow used on this project, plus pointers to the existing redesign spec and plan.
- **`.assetsignore` extended** to keep `README.md`, `CLAUDE.md`, and `CHANGELOG.md` out of the public asset bundle. Visible on GitHub, hidden from the live site — consistent with how `docs/`, `.gitignore`, and `wrangler.jsonc` were already excluded.
- **GitHub About panel filled in** — description, live website link, and topics tags (`personal-blog`, `essays`, `static-site`, `html-css`, `cloudflare-workers`, `editorial-design`, `responsive-design`, `canada`).

### Deferred / known follow-ups

- **`www → apex` canonical redirect.** Both variants serve identical content, but no single canonical URL is chosen yet. A Cloudflare Redirect Rule (match `Hostname equals www.awonderfullife.ca`, static target `https://awonderfullife.ca`, preserve path + query, status 301) would close this. Polish, not a fix.
- **Replace Picsum stand-in hero images** in `assets/images/posts/<slug>.jpg` with curated Unsplash photography. All 16 current images are deterministic Picsum stand-ins (seeded by slug) — they render, but they're not topical.
- **Simplify thumbnail / hero `alt` attributes.** They currently restate the post title; the linked title already announces it to screen readers. Cleaner fix: `alt=""` for decorative thumbs, descriptive alt for heroes once curated photography lands.
- **Drop `.html` from internal links.** Cloudflare canonicalizes URLs without the suffix; current internal hrefs trigger a 301 hop per click. Cosmetic.

---

## 2026-05-27 — Full editorial redesign

A complete redesign moved the site from a generic Medium-lite layout to a typography-led editorial direction with hero photography, faceted browsing, and a five-category taxonomy. **17 commits** to `main`, all deployed via Cloudflare Workers with Static Assets.

### Design system

- New stylesheet (`assets/css/style.css`): **Manrope** throughout (humanist sans, GE-Inspira-adjacent), crisp white + ink + editorial blue palette, **800px container** (widened from 680px).
- All design tokens centralized in `:root` (`--color-bg`, `--color-text`, `--color-accent`, `--font`, `--max-width`, etc.).
- Editorial hierarchy on every list and post: kicker (category, uppercase, tracked, accent blue) → title → rule/byline → excerpt/body.

### Pages and structure

- **`index.html`** rewritten as a thumbnail-led list of all 16 posts (was 5). Each row: thumbnail + kicker + title + excerpt + date.
- **`archive.html`** rebuilt as a year-grouped compact list with a faceted browsing strip at the top (category pills + period chips, anchor links to year sections below).
- **Five new category pages** at `categories/{reflection,society,politics,technology,travel}.html`. Same faceted nav, each filtered to its category. The "All" pill (back to archive) plus each category pill on every browse page.
- **All 16 post pages** got a category kicker, uppercase byline, and a hero image slot.
- **`about.html`** font upgrade to Manrope (layout intentionally preserved).
- **Kickers became clickable.** Every "REFLECTION", "POLITICS", etc., on the homepage and inside each post now links to the relevant category page.

### Imagery

- **16 Picsum stand-in hero images** sourced (deterministic URLs seeded by slug) and committed to `assets/images/posts/`. Placeholders pending curated photography.

### Content cleanup

- **Cleaned all 16 post bodies** of WordPress import artifacts: stray `</h2></h3>` tags appearing at every paragraph break, and raw `**bold**` / `*italic*` / `***bold-italic***` markdown markers that were never converted to HTML.
- **Trump vs Harris** scorecard rebuilt as a real `<table>` (was a flattened single-paragraph blob).
- **Ratan Tata** Longfellow couplet rendered as a `<blockquote>` (was orphaned italic markdown across two paragraphs).
- **Apple-intelligence post** title mismatch fixed: homepage/archive listings now match the post's actual `<h1>` ("How Apple's AI Enhances Everyday Life: A Review").

### Infrastructure

- **`wrangler.jsonc`** added to repo — Cloudflare Worker configuration is now version-controlled.
- **`.assetsignore`** added to keep `.git/`, `.wrangler/`, `docs/`, and other repo internals out of the public deploy. Prevents `git clone` from the live URL.
- **`.gitignore`** added (covers OS metadata, editor scratch, env files, `.superpowers/` brainstorming artifacts).

### Documentation produced during the redesign

- **Spec:** `docs/superpowers/specs/2026-05-27-website-redesign-design.md` — locked-in design decisions captured from the brainstorming session before any code was written.
- **Plan:** `docs/superpowers/plans/2026-05-27-website-redesign.md` — 12-task implementation plan with exact code, file paths, and verification commands.

---

## Earlier

Pre-redesign site was a generic blog template with five posts on the homepage. The original repo state is preserved at commit `7b3eab3` ("Initial Load") — useful if you ever need to reference what was there before the redesign.
