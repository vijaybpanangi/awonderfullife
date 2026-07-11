# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal essay blog of Vijay Panangipally, tagline *"Data, life, and the space between."* Sixteen posts as of this writing, spanning Reflection, Society, Politics, Technology, and Travel. The site was redesigned in May 2026 from a generic Medium-lite look into an editorial direction with hero photography, Manrope typography, and faceted browsing (see `docs/superpowers/specs/2026-05-27-website-redesign-design.md` for the locked-in design decisions and `docs/superpowers/plans/2026-05-27-website-redesign.md` for the original implementation plan).

## Build, run, deploy

The site is built with **Eleventy** (`@11ty/eleventy` v3). Posts are Markdown (`src/content/posts/*.md`); every other page (home, about, archive, categories, feed, sitemap) is a Nunjucks template in `src/content/`. `npm run build` renders everything into `_site/` — that directory, not the repo root, is what Cloudflare serves.

- **Live site:** <https://awonderfullife.ca> — Cloudflare Workers with Static Assets auto-deploys from `main` on every push. The Workers Build runs `npm ci && npm run build`; `wrangler.jsonc`'s `assets.directory` is `./_site`.
- **Build locally:** `npm ci && npm run build` from the repo root — writes `_site/`.
- **Preview locally:** `npm run serve` (Eleventy's dev server with live reload), or build once and serve the static output (`npm run build && cd _site && python3 -m http.server 8000`).
- **Verify a deploy:** after pushing, the Cloudflare dashboard shows the Workers Build running `npm ci && npm run build`; the live site updates once it completes. There are no automated tests for the static site; verification is visual (the API worker in `/api` does have Vitest — see below).
- **No `.assetsignore` anymore.** The asset directory is `_site/`, which contains only Eleventy's build output — nothing sensitive (no `.git`, `node_modules`, `src/`, `docs/`, `api/`) ever lands in it, so there's nothing to exclude.

## The API worker (`/api`)

The repo hosts a **second, independent Cloudflare Worker** alongside the static site — the platform spine.

- **Static site (repo root):** Eleventy build, `assets.directory: "./_site"`, auto-deploys from `main` (see "Build, run, deploy" above).
- **API worker (`/api`):** TypeScript on the Workers runtime, with its own `package.json`, `wrangler.jsonc`, and Vitest tests. Served at **`api.awonderfullife.ca`** (custom domain; `workers_dev` off). The static site is untouched.

**Routes:** `GET /health` (public → `{status,time}`), `GET /admin/whoami` (Cloudflare-Access-gated → verified email + a D1 `SELECT 1` flag), `POST /subscribe` (Turnstile + CORS + idempotent D1 upsert), and `GET /unsubscribe?token=` (deletes the row, returns an HTML page).

**Compose UI (Access-gated):** `GET /admin/compose` serves a self-contained in-browser newsletter editor (`src/admin.ts`) — a **Toast UI rich editor** (WYSIWYG → Markdown), a **Sign out** link (`/cdn-cgi/access/logout`), and a schedule picker (next Saturday 7pm ET, or a custom ET time). Its endpoints `GET|POST /admin/issues`, `POST /admin/issues/preview`, `POST /admin/issues/test` (sends only to the signed-in admin), `POST /admin/issues/unqueue` are all under `/admin` (Access + in-code JWT). **Schedule-only** — queue/preview/test, no broadcast-now. The email template lives in **one shared module, `src/render.mjs`** (plain JS so Node's CLI can run it; `render.d.mts` gives the worker TS types); scheduling math is in `src/schedule.mjs` (ET↔UTC, DST-correct). Both are imported by the worker and `scripts/send-issue.mjs`.

**Scheduled handler (newsletter):** the Worker's `scheduled` handler (`src/scheduled.ts`) runs on a **15-minute cron tick** (`*/15 * * * *`) and sends every issue whose **per-issue `scheduled_at`** (UTC) has arrived — so the default "next Saturday 7pm ET" and any custom ET time both work, and a missed tick is caught by the next. Each due issue is claimed atomically, sent to all active subscribers via Resend's batch endpoint, then marked `sent`. Issues are rendered at queue time (web UI or CLI) with a `{{UNSUB_URL}}` placeholder the handler swaps per recipient. (NB: Cloudflare cron day-of-week is non-standard, `1`=Sun…`7`=Sat — use `SAT`/`SUN` names if you add a day-specific trigger.) See `api/issues/README.md`. The same cron tick also runs the **comment moderation sweep** (`runCommentModeration`).

**Comments (`src/comments.ts`):** stored in **D1** (`comments` + `comment_verifications`, migration `0004`) — no separate DB. `GET /comments?slug=`, `POST /comments`, `GET /comments/verify` (CORS + credentials for the cross-origin widget). A comment publishes **immediately** once the author confirms via a Resend magic link (which sets a 30-day `awl_c` session cookie signed with `COMMENT_SECRET`, so repeat comments skip the email); email is stored for verification only, never shown. The 15-min sweep classifies new comments (heuristics + Workers AI `AI` binding) and **tombstones** failures in place (`status='removed'`). Front end: shared XSS-safe widget `assets/js/comments.js` (user text via `textContent`), embedded on every post as `<section id="comments" data-slug="…">`. Degrades gracefully if `COMMENT_SECRET`/`AI` are unset.

**Security:** Access protects `api.awonderfullife.ca/admin*`; the worker *also* verifies the Access JWT in-code (`src/access.ts`, via `jose`) — safe even if reached directly. `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `TURNSTILE_SECRET`, and `RESEND_API_KEY` are **Wrangler secrets** (never committed — this repo is public); `NEWSLETTER_FROM`/`NEWSLETTER_REPLY_TO` are non-secret `vars`. `COMMENT_SECRET` (signs comment sessions) is an optional Wrangler secret; the `AI` binding powers comment moderation. D1 binding is `DB` (database `awonderfullife-api`); schema in `migrations/` — `subscribers` (`0001`), `issues` (`0002`), `issues.scheduled_at` (`0003`), and `comments` + `comment_verifications` (`0004`).

**Working in `/api`:**
- Test: `cd api && npm test` (Vitest + `@cloudflare/vitest-pool-workers` — runs in workerd with a local D1)
- Typecheck: `cd api && npm run typecheck`
- Local dev: `cd api && npm run dev` (needs `api/.dev.vars` — copy from `.dev.vars.example`)
- Deploy: **auto-deploys** via its own Cloudflare Workers Build on any push to `main` that touches `/api` (root dir `api`, `npm ci` + `npx wrangler deploy`, watch path `api/*`, production-only). `cd api && npm run deploy` still works for ad-hoc/manual deploys. (The static site has a separate Workers Build at the repo root.)

**Toolchain note (vitest-pool-workers v4):** the Vitest config uses the v4 plugin API — `cloudflareTest({...})` from `@cloudflare/vitest-pool-workers` composed with `defineConfig` from `vitest/config` (the older `defineWorkersConfig` from `…/config` no longer exists). The `cloudflare:test` ambient types come from the package's `./types` entry, referenced in `api/test/env.d.ts`.

Spec: `docs/superpowers/specs/2026-06-13-api-spine-foundation-design.md` · Plan: `docs/superpowers/plans/2026-06-13-api-spine-foundation.md`.

## The big picture: where content lives

```
src/content/posts/<slug>.md     Individual post — ONE Markdown file per post, front matter + body
src/content/index.njk           → _site/index.html — featured opener + illustrated 3-col card grid
src/content/about.njk           → _site/about.html — About page (180×180 editorial-square portrait + prose)
src/content/archive.njk         → _site/archive.html — year-grouped compact list of every post + faceted nav
src/content/categories.njk      → _site/categories/<cat>.html — one page per category (paginated over site.categories)
src/content/feed.njk            → _site/feed.xml — RSS feed, generated from the posts collection
src/content/sitemap.njk         → _site/sitemap.xml — generated from every page + post
src/_layouts/base.njk           Shared page shell (head, header, footer, newsletter)
src/_layouts/post.njk           Post page shell (hero, dek, byline, post-nav, comments section)
src/_includes/                  header, footer, card-grid, facets, post-nav, head-seo, jsonld, newsletter, author-card
src/_data/site.json             Site-wide data: name, tagline, url, author, categories
eleventy/filters.mjs            Date/URL/text Nunjucks filters (cardDate, readingTime, cleanUrl, etc.)
eleventy/jsonld.mjs             JSON-LD @graph builder (mirrors the retired seo-inject.py)
assets/css/style.css            Single global stylesheet (~480 lines), passthrough-copied verbatim into _site/
assets/images/                  Author portrait + hero images for each post, passthrough-copied
assets/images/posts/<slug>.jpg  Hero image per post (AI-generated editorial illustration series)
_site/                          Eleventy's generated output (gitignored) — this is what Cloudflare actually serves
```

Five categories in active use: **Reflection** (3 posts), **Society** (3), **Politics** (5), **Technology** (2), **Travel** (3).

## Adding or modifying a post: one Markdown file

Since the Eleventy re-platform (`v3.0.0`), a new post is **one file**: `src/content/posts/<slug>.md`. Everything that used to require hand-edits in four-plus places — the homepage card, the archive row, the category page, prev/next nav, the RSS feed, the sitemap, and the SEO head/JSON-LD — is now generated from that one file plus the posts collection. There is no second, third, or fourth file to touch.

**Front matter fields:**

- `title` — the post's `<h1>` / `<title>` text.
- `date` — `YYYY-MM-DD`; drives sort order, byline/card dates, archive year grouping, and feed/sitemap dates. (Front-matter dates parse as UTC midnight — every date filter reads UTC getters for this reason.)
- `category` — one of the five category slugs in `src/_data/site.json` (`reflection`, `society`, `politics`, `technology`, `travel`).
- `description` — meta description / OG / Twitter description text.
- `excerpt` — the card excerpt shown on the homepage, the category page, and (for the newest post) the featured opener. (An `excerptHome` override for a homepage-only excerpt was part of the original migration contract, but no template currently reads it — `card-grid.njk` and `index.njk` both render `excerpt` unconditionally. Don't rely on setting `excerptHome` alone; it would need `card-grid.njk`/`index.njk` wired to prefer it first.)
- `heroAlt` — descriptive alt text for the hero image (describe what it *shows*, not what the post is about; don't restate the title).
- `minRead` — pins the "N MIN READ" byline/card figure. Optional: omit it and the `readingTime` filter computes words ÷ 200 (rounded, minimum 1) from the rendered content automatically.
- `guid` — **omit for new posts.** The RSS `<guid>` auto-falls-back to the extension-less canonical URL (`{{ site.url }}/posts/<slug>`) when absent. Only the legacy-migrated posts carry an explicit `guid` — they froze their original `.html` permalink as the canonical GUID so existing RSS subscriptions don't see a spurious "new" item.
- `dek` — optional italic sub-headline rendered under the `<h1>` (`.post-dek`). Leave it out if the post doesn't have one.
- `heroTitled` — optional boolean; adds the `is-hero-titled` class to the post header for posts whose hero art is meant to visually anchor the title differently. Leave it out unless you're matching an existing "hero-titled" post's treatment.
- `listTitle` — optional; overrides `title` on card grids and prev/next nav (falls back to `title` if absent). Use only if the card/nav title needs to differ from the on-page `<h1>` (e.g. a shorter list-friendly variant).

Steps for a new post:

1. Create `src/content/posts/<slug>.md` with front matter (above) and the body in Markdown (`markdown-it`, HTML passthrough on, typographer off — literal curly quotes/ellipses in prose render as-is, they are not "smartened" or corrected).
2. **Generate a hero illustration.** Run `docs/superpowers/tools/gen-hero.sh <slug> "<subject prompt>" <seed>` — saves to `assets/images/posts/<slug>.jpg`. Credentials: `$HOME/.cloudflare_ai_token` (API token) and `$HOME/.cloudflare_ai_account` (account ID). **Never commit these files.** View the result and regenerate if needed for style/quality/series cohesion (flat editorial style, terracotta/slate-blue/cream palette).
3. **Add a manifest row.** In `docs/superpowers/specs/2026-06-11-image-manifest.md`, record the slug, seed, prompt, alt text, and file size.
4. `npm run build`. That's it — the homepage card/featured opener, archive row, category page, prev/next nav (chronological neighbors within the posts collection, computed automatically), `feed.xml`, `sitemap.xml`, and the SEO head/JSON-LD are all generated from the front matter above. Nothing else to edit by hand.

**Editing an existing post** is the same: edit its one `.md` file, `npm run build`. No neighboring-post nav edits, no second-file card updates — those are recomputed from the posts collection on every build.

## SEO / structured-data layer (in every page `<head>`)

Every page carries, before `</head>`: an absolute self-canonical, Open Graph + Twitter Card tags (`og:type` is `article` on posts, `website` elsewhere), and a schema.org JSON-LD `@graph`. The graph shares a `WebSite` + `Person` (Vijay Panangipally) + `Blog`, with a per-page node: posts are `BlogPosting` (headline/date/image/section parsed from front matter), other pages are `CollectionPage` / `AboutPage`. This block is generated by `src/_includes/head-seo.njk` (canonical + OG + Twitter) and the `jsonld` include, backed by `eleventy/jsonld.mjs` (the `buildGraph()` function, registered as the Nunjucks global `jsonLdGraph`). **The old `docs/superpowers/tools/seo-inject.py` script — a one-time Python injector that regex-parsed hand-authored HTML — is retired**; there is nothing to re-run after adding a post, the build produces the same block automatically. `feed.xml`, `sitemap.xml`, and `robots.txt` are likewise generated (feed/sitemap from the posts collection; `robots.txt` is still a static passthrough file at the repo root). `og:image`: posts use their hero, About uses `vijay.jpg`, other pages use `assets/images/og-default.jpg`.

## Stylesheet (`assets/css/style.css`)

Single source of styling. Defines a small token palette in `:root`:

- `--color-bg` (`#ffffff`), `--color-text` (`#111111`), `--color-text-light` (`#666666`)
- `--color-border` (`#e5e5e5`), `--color-accent` (`#0a4a9a` editorial blue)
- `--color-bg-soft` (`#f9f9f9`) for code blocks
- `--max-width: 860px` — base container width (header, about, archive); `--max-width-wide: 1200px` for the home/category grids; post shell `.container--post` 1200px; post reading column `.post-content` capped at 44rem (~73ch)
- `--font: 'Manrope'` — loaded via Google Fonts `<link>` in each HTML file
- **Liquid Glass tokens** (`v2.4.0`): `--glass-bg` (~55% white), `--glass-blur` (`blur(18px) saturate(1.8) brightness(1.06)`), `--glass-rim` (specular bevel). Applied to the **sticky frosted `header`** (which blurs content scrolling under it), the **newsletter** card, and **`.facet-chip`** pills. An `@supports not (backdrop-filter)` block near the top of the file keeps those surfaces near-opaque where blur is unsupported. The `<body>` carries a barely-there accent-blue radial glow at the top so the glass has something to refract; the body/card-grid otherwise stay crisp white. Note the header is now `position: sticky` (compact bar: title + tagline inline, nav right) — it was a tall static masthead before.

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
- **Kickers are links:** `<a class="kicker" href="/categories/<slug>">CategoryName</a>` on the homepage, category pages, and inside each post — always the same absolute, extension-less path (no more relative `../categories/...` from post pages; that was a legacy-HTML artifact the generated templates don't have).
- **Faceted browsing strip** on `archive.html` and each `categories/*.html`: a `<div class="facets">` with two `<nav class="facet">` rows (category pills + period chips). The pill on the current page is `<span class="facet-chip is-current">`; others are `<a class="facet-chip">`.
- **Year anchors:** `<h1 class="archive-year" id="yearYYYY">` so the period chips can scroll-to.
- **Newsletter form:** posts to the **owned API** (`POST https://api.awonderfullife.ca/subscribe`) with a Cloudflare **Turnstile** widget — Buttondown was retired in v2.8.0. Capture, broadcast, and the weekly scheduled send all live in `/api` (see its section above and `api/issues/README.md`).
- **Disclaimer in footer:** simple copyright. Footer was intentionally kept minimal during the redesign.

## Post body content

Post bodies inside `<div class="post-content">` were cleaned in commit `6df6352` to fix the WordPress export's artifacts (stray `</h2></h3>` tags at every paragraph break and raw `**bold**` / `*italic*` / `***bold-italic***` markdown markers that were never converted to HTML). When editing or adding posts:

- Wrap each paragraph in `<p>...</p>`.
- Use `<strong>` for bold, `<em>` for italic, `<blockquote><p>...</p></blockquote>` for quotations, `<h2>` / `<h3>` for section headings.
- Do not leave raw markdown markers in HTML; they will not render.

**Editorial style (NYT-inspired, locked in `v2.13.0`).** All posts follow these — match them in new posts and edits:
- **Body is 17px / line-height 1.7 / left-aligned** (not justified). Font stays Manrope.
- **Minimal inline emphasis.** No "emphasis spam." Reserve `<strong>`/`<em>` for reference-list source labels, definition-list lead-ins, and titles of works/foreign terms — not whole phrases or sentences.
- **No em dashes (—)** in prose. Use commas, colons, periods, parentheses, or a conjunction. (En dashes `–` are fine in ranges; an em dash inside a *cited* real headline may stay.)
- **Canadian English:** `honour`, `neighbour`, `defence`, `travelled`, `centre`/`kilometre` (-re), `labour`; keep `-ize` (realize/organize). Never Canadianize proper nouns (Bureau of Labor Statistics, Brennan Center), URLs, or the SVG `color-interpolation-filters` attribute.
- **No promotional/CTA endings** ("join the conversation", "share in the comments" — there is no comments system). Close reflectively in the author's plain voice.
- **References** go in `<section class="post-references">` (an `<h3>` + a `<ul>` of `<li><strong>Source</strong> – <a href target=_blank rel=noopener>Title</a></li>`); styled smaller/muted by `.post-references`.

## Project documentation conventions

- `docs/superpowers/specs/` — design specs (the *what* and *why*): `YYYY-MM-DD-<topic>-design.md`.
- `docs/superpowers/plans/` — implementation plans (the *how*): `YYYY-MM-DD-<topic>.md`.
- `ROADMAP.md` at the root tracks **future** work and deferred items; `CHANGELOG.md` tracks **past** changes. Always check both before proposing work — the answer to "is this on the radar?" is in one or the other.
- **Releases & versioning.** Every release gets a semver git tag on its merge commit — **major** = redesign / identity shift, **minor** = new feature or notable enhancement, **patch** = fix / content / docs. When you ship a change, add a versioned `CHANGELOG.md` entry (`## vX.Y.Z — Title (YYYY-MM-DD HH:MM UTC)`, timestamp from the merge commit) and create + push the matching tag (`git tag -a vX.Y.Z -m "…" && git push origin vX.Y.Z`). Also add a row to the README change-history table (`| version | when | PR | summary |`). Latest: `v3.0.0`.
- See `docs/superpowers/README.md` for the brainstorm → spec → plan → execute workflow.

## Known follow-ups

- ~~Drop `.html` from internal links.~~ Resolved by the Eleventy re-platform (`v3.0.0`): every generated internal `href` (`header.njk`, `post-nav.njk`, `facets.njk`, `card-grid.njk`) is already extension-less (`/archive`, `/posts/<slug>`, `/categories/<slug>`) — no more 301 hop.
- See `ROADMAP.md` for what's next now that the build unlocks it (dark mode, search, related posts).
