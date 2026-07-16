# A Wonderful Life

> *Data, life, and the space between.*

**Live:** <https://awonderfullife.ca>

Personal essay blog of **Vijay Panangipally** — a data-driven storyteller, observer of the world, and writer based in Southern Ontario. The blog sits at the crossroads of analytics and the human experience: it writes about technology and AI, the politics shaping the U.S. and Canada, life in Toronto and journeys further afield, reflection on integrity and endurance, and the people whose quiet greatness is worth remembering.

Sixteen posts as of this writing, across five categories:

- **Reflection** — endurance, integrity, lives well lived
- **Society** — data, truth, education, partition and unity
- **Politics** — elections, leadership, the Canada/U.S. relationship
- **Technology** — Apple Intelligence, the changing shape of AI in everyday life
- **Travel** — slow journeys across Canada, winter in Toronto, borders crossed

## Tech

Built with **Eleventy** (`@11ty/eleventy` v3). Posts are Markdown (`src/content/posts/*.md`); every other page — home, about, archive, categories, RSS feed, sitemap — is a Nunjucks template. `npm run build` renders it all into `_site/`, which is what actually gets deployed. The site was originally a generic blog template and was rebuilt in May 2026 into an editorial design — Manrope typography, hero photography on every post, a year-grouped archive, and a faceted-browsing layer that lets readers move between categories or jump to a year. In June 2026, a second redesign ("Quiet Magazine") refreshed the homepage into a featured opener + 2-column illustrated card grid, upgraded post pages with display-scale titles and prev/next navigation, and replaced all 16 Picsum stand-in heroes with a cohesive AI-generated editorial-illustration series (Cloudflare Workers AI, flat terracotta/slate-blue/cream style). In July 2026, the site was re-platformed from hand-authored HTML onto this Eleventy build — one Markdown file per post, everything else generated, byte-faithful to the pre-cutover site (see `v3.0.0` below).

Deployment is on **Cloudflare Workers with Static Assets**. The Worker configuration (`wrangler.jsonc`) is committed to the repo; its `assets.directory` points at `./_site`. A push to `main` triggers a Workers Build (`npm ci && npm run build`) and an automatic deploy in about 30 seconds. There's no `.assetsignore` anymore — the asset directory is `_site/`, which only ever contains Eleventy's generated output, so there's nothing sensitive to exclude.

## What's in the repo

```
/src/content/posts/<slug>.md   Individual essays — ONE Markdown file per post
/src/content/*.njk             Home, about, archive, categories, feed, sitemap templates
/src/_layouts/                 Shared page shells (base, post)
/src/_includes/                Header, footer, card-grid, facets, post-nav, SEO head, JSON-LD, newsletter
/src/_data/site.json           Site-wide data: name, tagline, url, author, categories
/eleventy/                     Nunjucks filters + the JSON-LD @graph builder
/eleventy.config.js            Eleventy build config
/_site/                        Generated output (gitignored) — this is what Cloudflare serves
/assets/css/style.css          Single stylesheet (Manrope, white + editorial blue)
/assets/images/                Author portrait + hero images for each post
/wrangler.jsonc                Cloudflare Worker configuration (assets.directory: ./_site)
/docs/superpowers/             Specs and implementation plans
```

## Working with the site

### Preview locally

```bash
npm ci
npm run build
npm run serve   # Eleventy dev server with live reload, or:
cd _site && python3 -m http.server 8000
```

### Deploy

Push to `main`. Cloudflare's Workers Build runs `npm ci && npm run build` and deploys `_site/` automatically. The Cloudflare dashboard shows the build log; the live site at <https://awonderfullife.ca> updates within ~30 seconds. No automated tests for the static site — verification is visual.

### Adding a new post

A new post is **one file**: `src/content/posts/<slug>.md`. The homepage card/featured opener, the archive row, the category page, prev/next nav, `feed.xml`, `sitemap.xml`, and the SEO head/JSON-LD are all generated from its front matter and the posts collection — nothing else to hand-edit.

1. Create `src/content/posts/<slug>.md` with front matter (`title`, `date`, `category`, `description`, `excerpt`, `heroAlt`, optionally `minRead`/`dek`/`heroTitled`/`listTitle`; omit `guid` — it's only set on legacy-migrated posts to freeze their original canonical URL) and the Markdown body. See `CLAUDE.md` for the full field reference.
2. Generate a hero illustration via `docs/superpowers/tools/gen-hero.sh <slug> "<subject prompt>" <seed>` (credentials at `$HOME/.cloudflare_ai_token` and `$HOME/.cloudflare_ai_account`, never committed). Add a manifest row in `docs/superpowers/specs/2026-06-11-image-manifest.md` with the seed, prompt, and alt text. Target file size ≤200KB; the generated illustrations average ~95KB.
3. `npm run build`. Done.

## Project documentation

- **`CLAUDE.md`** — operating notes for Claude Code sessions working in this repo (architecture, conventions, gotchas, deferred follow-ups).
- **`docs/superpowers/specs/`** — design specs for non-trivial changes.
- **`docs/superpowers/plans/`** — implementation plans matched to specs.
- **`CHANGELOG.md`** — curated trail of notable changes (design, infrastructure, documentation).
- **`ROADMAP.md`** — future updates and deferred items (email migration, canonical-URL redirect, drop `.html` from internal links, india-pakistan hero regen).

Anything more substantial than a copy edit goes through a brainstorm → spec → plan → execute workflow; see `docs/superpowers/README.md` for that convention.

## Release history

One row per release — every release is a semver git tag on its merge commit. Full notes in [`CHANGELOG.md`](CHANGELOG.md); all tags at [github.com/vijaybpanangi/awonderfullife/tags](https://github.com/vijaybpanangi/awonderfullife/tags). Newest first.

| Version | When (UTC) | PR | Summary |
|---|---|---|---|
| `v3.5.4` | 2026-07-16 | [#65](https://github.com/vijaybpanangi/awonderfullife/pull/65) | New post: "The Wait Was Worth It" (iOS 27 Siri AI); series' first post with inline photoreal figures |
| `v3.5.3` | 2026-07-16 | [#64](https://github.com/vijaybpanangi/awonderfullife/pull/64) | Humanized all 17 homepage excerpts (first-person) + balanced title SEO optimization |
| `v3.5.2` | 2026-07-16 | [#63](https://github.com/vijaybpanangi/awonderfullife/pull/63) | Fix: cache-bust the About portrait (rename to `vijay-v2.jpg`) so the immutable cache serves the new image |
| `v3.5.1` | 2026-07-16 | [#62](https://github.com/vijaybpanangi/awonderfullife/pull/62) | First-person meta descriptions for all 17 posts + new 800×800 About portrait |
| `v3.5.0` | 2026-07-16 | [#61](https://github.com/vijaybpanangi/awonderfullife/pull/61) | SEO structured-data + social/OG enrichment (`sameAs`, `BreadcrumbList`, `og:image` dims/alt, Twitter attribution, `updated` field) |
| `v3.4.0` | 2026-07-11 | [#59](https://github.com/vijaybpanangi/awonderfullife/pull/59) | Zero-PII "appreciate" button on posts (owned reactions API, localStorage, dark-safe) |
| `v3.3.0` | 2026-07-11 | [#58](https://github.com/vijaybpanangi/awonderfullife/pull/58) | Related-posts "More reading" strip on each post (build-time, same-category + backfill) |
| `v3.2.0` | 2026-07-11 | [#57](https://github.com/vijaybpanangi/awonderfullife/pull/57) | Static search (Pagefind) on the archive — build-time index, posts-only, light+dark |
| `v3.1.0` | 2026-07-11 | [#56](https://github.com/vijaybpanangi/awonderfullife/pull/56) | Dark mode: prefers-color-scheme + header toggle, no-FOUC pre-paint, WCAG AA |
| `v3.0.0` | 2026-07-11 | [#55](https://github.com/vijaybpanangi/awonderfullife/pull/55) | Re-platform to Eleventy: posts are Markdown, all pages/feed/sitemap/SEO generated; parity-verified byte-faithful; zero visual change |
| `v2.17.5` | 2026-07-10 | [#52](https://github.com/vijaybpanangi/awonderfullife/pull/52) | "Built With AI, Here to Stay": full editorial rewrite (owner's edited draft, 7 h2 sections + dek) |
| `v2.17.4` | 2026-07-10 | [#51](https://github.com/vijaybpanangi/awonderfullife/pull/51) | "Built With AI, Here to Stay": hand-picked photoreal hero replacing the AI-flat-editorial one |
| `v2.17.3` | 2026-07-10 15:25 | [#49](https://github.com/vijaybpanangi/awonderfullife/pull/49) | New post: "Built With AI, Here to Stay" (Technology) + seo-inject.py canonical `.html` fix |
| `v2.17.2` | 2026-06-18 16:22 | [#44](https://github.com/vijaybpanangi/awonderfullife/pull/44) | Fix: stop immutable-caching CSS/JS (returning visitors pinned stale styles for a year) |
| `v2.17.1` | 2026-06-18 16:14 | [#43](https://github.com/vijaybpanangi/awonderfullife/pull/43) | Ambient backdrop: brighter + comet-forward (three sweeping comets) |
| `v2.17.0` | 2026-06-18 16:08 | [#42](https://github.com/vijaybpanangi/awonderfullife/pull/42) | Ambient drifting backdrop on the homepage (palette clouds + comet, reduced-motion safe) |
| `v2.16.7` | 2026-06-18 13:45 | [#41](https://github.com/vijaybpanangi/awonderfullife/pull/41) | About portrait: rounded corners (4px → 14px) to match the site |
| `v2.16.6` | 2026-06-18 13:39 | [#40](https://github.com/vijaybpanangi/awonderfullife/pull/40) | Wider layout: grids 1080→1200, post shell →1200, base →860, reading column →44rem |
| `v2.16.5` | 2026-06-18 13:31 | [#39](https://github.com/vijaybpanangi/awonderfullife/pull/39) | Homepage: 3-column card grid for non-featured posts (rounded corners kept) |
| `v2.16.4` | 2026-06-16 21:10 | [#37](https://github.com/vijaybpanangi/awonderfullife/pull/37) | Favicon: recolor monogram to a softer semi-light gray |
| `v2.16.3` | 2026-06-16 20:59 | [#36](https://github.com/vijaybpanangi/awonderfullife/pull/36) | Favicon: brand "A" monogram (svg/ico/apple-touch) replacing the cached WordPress leftover |
| `v2.16.2` | 2026-06-16 20:43 | [#35](https://github.com/vijaybpanangi/awonderfullife/pull/35) | Comments: whole section as one frosted pane with nested translucent comment cards |
| `v2.16.1` | 2026-06-16 20:33 | [#34](https://github.com/vijaybpanangi/awonderfullife/pull/34) | Comments restyled into the Liquid-Glass design language (frosted pane, recessed inputs, beveled button, avatars) |
| `v2.16.0` | 2026-06-16 20:16 | [#33](https://github.com/vijaybpanangi/awonderfullife/pull/33) | Comments: email-verified instant posting + AI auto-moderation sweep (D1 + API worker) |
| `v2.15.1` | 2026-06-16 18:08 | [#32](https://github.com/vijaybpanangi/awonderfullife/pull/32) | Fix: remove invalid host-based `_redirects` that blocked the v2.15.0 deploy (www→apex moves to a dashboard rule) |
| `v2.15.0` | 2026-06-16 17:48 | [#31](https://github.com/vijaybpanangi/awonderfullife/pull/31) | Site polish: rounded 3:2 images, sticky author sidebar, asset caching + srcset, security headers, clean URLs, RSS feed |
| `v2.14.0` | 2026-06-16 17:05 | [#30](https://github.com/vijaybpanangi/awonderfullife/pull/30) | Hero refresh complete: all 16 posts (photoreal ChatGPT covers, 9 composed / 7 textless) |
| `v2.13.0` | 2026-06-16 15:06 | [#29](https://github.com/vijaybpanangi/awonderfullife/pull/29) | Editorial sweep: 17px left-aligned body, strip emphasis spam, no em dashes, Canadian spelling, calm closings |
| `v2.12.2` | 2026-06-16 13:39 | [#28](https://github.com/vijaybpanangi/awonderfullife/pull/28) | Post fixes: data-dilemma references (links + smaller font), iOS 18.5 heading |
| `v2.12.1` | 2026-06-16 00:39 | [#27](https://github.com/vijaybpanangi/awonderfullife/pull/27) | Hero refresh (batch 1): photoreal composed covers on 5 posts |
| `v2.12.0` | 2026-06-15 23:44 | [#26](https://github.com/vijaybpanangi/awonderfullife/pull/26) | Compose UI: rich editor (Toast UI), sign-out, per-issue custom scheduling (`*/15` cron) |
| `v2.11.0` | 2026-06-15 23:23 | [#25](https://github.com/vijaybpanangi/awonderfullife/pull/25) | Newsletter compose UI — login-protected in-browser authoring at `/admin/compose` |
| `v2.10.1` | 2026-06-15 23:08 | [#24](https://github.com/vijaybpanangi/awonderfullife/pull/24) | Fix: Cloudflare's non-standard cron day-of-week (`SAT`/`SUN`) so triggers deploy |
| `v2.10.0` | 2026-06-15 22:59 | [#23](https://github.com/vijaybpanangi/awonderfullife/pull/23) | Newsletter automation — scheduled weekly send (Saturday 7pm ET, DST-correct) + queue |
| `v2.9.2` | 2026-06-15 21:44 | [#22](https://github.com/vijaybpanangi/awonderfullife/pull/22) | Newsletter CLI: clear errors for placeholder key/email |
| `v2.9.1` | 2026-06-15 21:39 | [#21](https://github.com/vijaybpanangi/awonderfullife/pull/21) | Newsletter Reply-To → v@awonderfullife.ca |
| `v2.9.0` | 2026-06-15 21:12 | [#20](https://github.com/vijaybpanangi/awonderfullife/pull/20) | Newsletter send CLI (markdown → Resend broadcast) |
| `v2.8.0` | 2026-06-15 20:08 | [#19](https://github.com/vijaybpanangi/awonderfullife/pull/19) | Newsletter live: owned signup (Turnstile + D1) replaces Buttondown |
| `v2.7.0` | 2026-06-15 19:51 | [#18](https://github.com/vijaybpanangi/awonderfullife/pull/18) | Edge-lensing Liquid Glass, site-wide (Chromium-only) |
| `v2.6.2` | 2026-06-15 19:47 | [#17](https://github.com/vijaybpanangi/awonderfullife/pull/17) | Justify post body text |
| `v2.6.1` | 2026-06-15 19:02 | [#14](https://github.com/vijaybpanangi/awonderfullife/pull/14) | docs: PR-level release table + CHANGELOG (newsletter & capsule) |
| `v2.6.0` | 2026-06-15 18:59 | [#12](https://github.com/vijaybpanangi/awonderfullife/pull/12) | Floating Liquid Glass capsule nav |
| `v2.5.0` | 2026-06-15 18:56 | [#11](https://github.com/vijaybpanangi/awonderfullife/pull/11) | Owned newsletter capture — `/subscribe` + `/unsubscribe` + Turnstile (D1) |
| `v2.4.2` | 2026-06-15 18:52 | [#13](https://github.com/vijaybpanangi/awonderfullife/pull/13) | Fix: site-header glass bleeding onto the post title block |
| `v2.4.1` | 2026-06-15 17:39 | [#10](https://github.com/vijaybpanangi/awonderfullife/pull/10) | Release governance — semver tags + versioned/timestamped CHANGELOG + doc currency |
| `v2.4.0` | 2026-06-15 17:10 | [#9](https://github.com/vijaybpanangi/awonderfullife/pull/9) | Liquid Glass editorial accents (frosted sticky header, newsletter, chips) |
| `v2.3.1` | 2026-06-15 15:05 | [#8](https://github.com/vijaybpanangi/awonderfullife/pull/8) | Contact email `v@` surfaced on About + Person JSON-LD |
| `v2.3.0` | 2026-06-15 14:28 | [#7](https://github.com/vijaybpanangi/awonderfullife/pull/7) | Email live via iCloud+ Custom Email Domain |
| `v2.2.1` | 2026-06-15 13:27 | [#6](https://github.com/vijaybpanangi/awonderfullife/pull/6) | Email DNS checker + hardened iCloud email plan |
| `v2.2.0` | 2026-06-15 04:39 | [#5](https://github.com/vijaybpanangi/awonderfullife/pull/5) | Technical SEO foundation (canonical, OG/Twitter, JSON-LD, sitemap, robots) |
| `v2.1.1` | 2026-06-15 04:04 | [#4](https://github.com/vijaybpanangi/awonderfullife/pull/4) | India-Pakistan hero regenerated (series cohesion) |
| `v2.1.0` | 2026-06-14 01:40 | [#3](https://github.com/vijaybpanangi/awonderfullife/pull/3) | API spine (Phase 1) — `api.awonderfullife.ca` (D1 + Cloudflare Access) |
| `v2.0.0` | 2026-06-11 21:43 | [#2](https://github.com/vijaybpanangi/awonderfullife/pull/2) | Quiet Magazine redesign + 16 AI-generated heroes |
| `v1.0.0` | 2026-05-28 17:53 | [tag](https://github.com/vijaybpanangi/awonderfullife/releases/tag/v1.0.0) | Editorial direction launch (Manrope, hero photography, faceted browsing) |

Planned work lives in [`ROADMAP.md`](ROADMAP.md).
