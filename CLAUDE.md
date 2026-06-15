# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal essay blog of Vijay Panangipally, tagline *"Data, life, and the space between."* Sixteen posts as of this writing, spanning Reflection, Society, Politics, Technology, and Travel. The site was redesigned in May 2026 from a generic Medium-lite look into an editorial direction with hero photography, Manrope typography, and faceted browsing (see `docs/superpowers/specs/2026-05-27-website-redesign-design.md` for the locked-in design decisions and `docs/superpowers/plans/2026-05-27-website-redesign.md` for the original implementation plan).

## Build, run, deploy

There is no build system. No `package.json`, no bundler, no test framework. Edits are made directly to HTML/CSS files.

- **Live site:** <https://awonderfullife.ca> — Cloudflare Workers with Static Assets auto-deploys from `main` on every push (config lives in `wrangler.jsonc`; the Pages-style integration was set up via the Cloudflare GitHub PR).
- **Preview locally:** `python3 -m http.server 8000` from the repo root, open `http://localhost:8000/`.
- **Verify a deploy:** after pushing, the Cloudflare dashboard shows the build, and the live site updates within ~30s. There are no automated tests; verification is visual.
- **Asset exclusion:** `.assetsignore` (gitignore-style) keeps repo internals (`.git/`, `.wrangler/`, `docs/`, `wrangler.jsonc`, this file, the README) **and the `/api` worker (`api`, `api/**`, `node_modules`)** out of the public asset bundle. When adding new private files, add them there too.

## The API worker (`/api`)

The repo hosts a **second, independent Cloudflare Worker** alongside the static site — the platform spine.

- **Static site (repo root):** still no build system — plain HTML/CSS, `assets.directory: "."`, auto-deploys from `main`.
- **API worker (`/api`):** TypeScript on the Workers runtime, with its own `package.json`, `wrangler.jsonc`, and Vitest tests. Served at **`api.awonderfullife.ca`** (custom domain; `workers_dev` off). The static site is untouched.

**Routes:** `GET /health` (public → `{status,time}`) and `GET /admin/whoami` (Cloudflare-Access-gated → verified email + a D1 `SELECT 1` flag).

**Security:** Access protects `api.awonderfullife.ca/admin*`; the worker *also* verifies the Access JWT in-code (`src/access.ts`, via `jose`) — safe even if reached directly. `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are **Wrangler secrets** (never committed — this repo is public). D1 binding is `DB` (database `awonderfullife-api`); no application schema yet.

**Working in `/api`:**
- Test: `cd api && npm test` (Vitest + `@cloudflare/vitest-pool-workers` — runs in workerd with a local D1)
- Typecheck: `cd api && npm run typecheck`
- Local dev: `cd api && npm run dev` (needs `api/.dev.vars` — copy from `.dev.vars.example`)
- Deploy: `cd api && npm run deploy` — **manual**; the API worker is *not* in the static site's push-to-`main` build (see `ROADMAP.md`).

**Toolchain note (vitest-pool-workers v4):** the Vitest config uses the v4 plugin API — `cloudflareTest({...})` from `@cloudflare/vitest-pool-workers` composed with `defineConfig` from `vitest/config` (the older `defineWorkersConfig` from `…/config` no longer exists). The `cloudflare:test` ambient types come from the package's `./types` entry, referenced in `api/test/env.d.ts`.

Spec: `docs/superpowers/specs/2026-06-13-api-spine-foundation-design.md` · Plan: `docs/superpowers/plans/2026-06-13-api-spine-foundation.md`.

## The big picture: where content lives

```
/index.html                     Homepage — featured opener + illustrated 2-col card grid
/about.html                     About page (180×180 editorial-square portrait + prose)
/archive.html                   Year-grouped compact list of every post + faceted nav
/categories/<cat>.html          One page per category, illustrated card grid — same faceted nav
/posts/<slug>.html              Individual post (one file per post)
/assets/css/style.css           Single global stylesheet (~480 lines)
/assets/images/                 Author portrait + hero images for each post
/assets/images/posts/<slug>.jpg Hero image per post (AI-generated editorial illustration series)
```

Five categories in active use: **Reflection** (3 posts), **Society** (3), **Politics** (5), **Technology** (2), **Travel** (3).

## Adding or modifying a post: the four-plus-places rule

Because there is no build system, a new post means edits in **four** files plus several additional steps:

1. `posts/<slug>.html` — the post itself. Open an existing post in the same category as a template; the structure is `<header class="post-header">` with `<a class="kicker">`, `<h1>`, `<p class="post-byline">` (include `· N MIN READ`, words ÷ 200), then `<img class="post-hero">`, then `<div class="post-content">`, ending with a `<nav class="post-nav">` footer block.
2. `index.html` — add the post as a new card in the illustrated card grid (newest first). Update the featured opener if the new post is the most recent.
3. `archive.html` — add to the correct `<h1 class="archive-year">` section.
4. `categories/<category>.html` — add a card to that category's grid.

**Additional steps for every new post:**

- **Update neighboring posts' prev/next nav.** The post that was previously the newest gets a "next" link added; the post immediately before the new one gets a "previous" update. Check both `<nav class="post-nav">` blocks.
- **Generate a hero illustration.** Run `docs/superpowers/tools/gen-hero.sh <slug> "<subject prompt>" <seed>` — saves to `assets/images/posts/<slug>.jpg`. Credentials: `$HOME/.cloudflare_ai_token` (API token) and `$HOME/.cloudflare_ai_account` (account ID). **Never commit these files.** View the result and regenerate if needed for style/quality/series cohesion (flat editorial style, terracotta/slate-blue/cream palette).
- **Add a manifest row.** In `docs/superpowers/specs/2026-06-11-image-manifest.md`, record the slug, seed, prompt, alt text, and file size.
- **Write a descriptive `alt` attribute.** Describe what the illustration *shows*, not what the post is about (e.g., `alt="A globe resting on a stack of newspapers, terracotta and slate-blue tones"`). Do not restate the post title.
- **Inject the SEO block.** Re-run `python3 docs/superpowers/tools/seo-inject.py` from the repo root. It is idempotent (skips pages that already have JSON-LD), so it only touches the new post: it adds the canonical, Open Graph + Twitter tags, and the `BlogPosting` JSON-LD, parsing the post's own `<h1>`, byline date, kicker category, and hero. Then add the new post's URL to `sitemap.xml` (with the post's published date as `<lastmod>`). See `docs/superpowers/specs/2026-06-15-blog-seo-foundation-design.md`.

## SEO / structured-data layer (in every page `<head>`)

Every page carries, before `</head>`: an absolute self-canonical, Open Graph + Twitter Card tags (`og:type` is `article` on posts, `website` elsewhere), and a schema.org JSON-LD `@graph`. The graph shares a `WebSite` + `Person` (Vijay Panangipally) + `Blog`, with a per-page node: posts are `BlogPosting` (headline/date/image/section parsed from the page), other pages are `CollectionPage` / `AboutPage`. This block is generated, not hand-written: `docs/superpowers/tools/seo-inject.py` (kept in `docs/`, which `.assetsignore` keeps out of the public bundle). `sitemap.xml` and `robots.txt` live at the repo root and are hand-maintained alongside it. `og:image`: posts use their hero, About uses `vijay.jpg`, other pages use `assets/images/og-default.jpg`.

## Stylesheet (`assets/css/style.css`)

Single source of styling. Defines a small token palette in `:root`:

- `--color-bg` (`#ffffff`), `--color-text` (`#111111`), `--color-text-light` (`#666666`)
- `--color-border` (`#e5e5e5`), `--color-accent` (`#0a4a9a` editorial blue)
- `--color-bg-soft` (`#f9f9f9`) for newsletter card and code blocks
- `--max-width: 800px` — page container width (widened from 680px during the redesign)
- `--font: 'Manrope'` — loaded via Google Fonts `<link>` in each HTML file

Section banner comments delimit related rules (`/* Header */`, `/* Featured post (homepage opener) */`, `/* Illustrated card grid (home + category pages) */`, `/* Single post page */`, `/* Post footer prev/next navigation */`, `/* Archive */`, `/* Faceted browsing strip */`, `/* Newsletter */`, etc.). Search for the banner of the area you're editing rather than scrolling.

New components added in the June 2026 Quiet Magazine redesign:

- `.featured` / `.featured-link` — homepage featured opener (img + h2.post-title live directly inside the link).
- `.card-grid` / `.card` / `.card-link` — 2-column illustrated card grid (homepage + categories).
- `.post-nav` / `.post-nav-link` / `.post-nav-prev` / `.post-nav-next` / `.post-nav-label` / `.post-nav-title` — prev/next footer navigation on single posts.
- `.container--wide` — 1080px container used by the homepage and category pages.
- `.post-hero` breakout — the `--breakout` clamp() inside `.post-hero` lets the hero bleed beyond the 800px post column (posts do NOT use `.container--wide`).
- `.post-byline` reading-time segment — `· N MIN READ` appended to the byline.

## Patterns worth preserving

- **Editorial hierarchy on every list and post:** kicker (category, uppercase, tracked, accent blue) → title → rule/byline → excerpt or body.
- **Kickers are links:** `<a class="kicker" href="categories/<slug>.html">CategoryName</a>` on the homepage and inside each post. Path is `categories/...` from root pages, `../categories/...` from post pages.
- **Faceted browsing strip** on `archive.html` and each `categories/*.html`: a `<div class="facets">` with two `<nav class="facet">` rows (category pills + period chips). The pill on the current page is `<span class="facet-chip is-current">`; others are `<a class="facet-chip">`.
- **Year anchors:** `<h1 class="archive-year" id="yearYYYY">` so the period chips can scroll-to.
- **Newsletter form:** Buttondown integration (action URL `https://buttondown.email/api/emails/embed-subscribe/awonderfullife`). Don't change the action — it's the live mailing list endpoint.
- **Disclaimer in footer:** simple copyright. Footer was intentionally kept minimal during the redesign.

## Post body content

Post bodies inside `<div class="post-content">` were cleaned in commit `6df6352` to fix the WordPress export's artifacts (stray `</h2></h3>` tags at every paragraph break and raw `**bold**` / `*italic*` / `***bold-italic***` markdown markers that were never converted to HTML). When editing or adding posts:

- Wrap each paragraph in `<p>...</p>`.
- Use `<strong>` for bold, `<em>` for italic, `<blockquote><p>...</p></blockquote>` for quotations, `<h2>` / `<h3>` for section headings.
- Do not leave raw markdown markers in HTML; they will not render.

## Project documentation conventions

- `docs/superpowers/specs/` — design specs (the *what* and *why*): `YYYY-MM-DD-<topic>-design.md`.
- `docs/superpowers/plans/` — implementation plans (the *how*): `YYYY-MM-DD-<topic>.md`.
- `ROADMAP.md` at the root tracks **future** work and deferred items; `CHANGELOG.md` tracks **past** changes. Always check both before proposing work — the answer to "is this on the radar?" is in one or the other.
- See `docs/superpowers/README.md` for the brainstorm → spec → plan → execute workflow.

## Known follow-ups

- **Drop `.html` from internal links.** Cloudflare canonicalizes URLs without `.html` (e.g. `/archive` not `/archive.html`). Internal hrefs still use `.html`, so every click goes through one 301 hop. Cosmetic; low priority.
