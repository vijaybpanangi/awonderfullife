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

Plain static HTML and one CSS file. No framework, no bundler, no build step. The site was originally a generic blog template and was rebuilt in May 2026 into an editorial design — Manrope typography, hero photography on every post, a year-grouped archive, and a faceted-browsing layer that lets readers move between categories or jump to a year. In June 2026, a second redesign ("Quiet Magazine") refreshed the homepage into a featured opener + 2-column illustrated card grid, upgraded post pages with display-scale titles and prev/next navigation, and replaced all 16 Picsum stand-in heroes with a cohesive AI-generated editorial-illustration series (Cloudflare Workers AI, flat terracotta/slate-blue/cream style).

Deployment is on **Cloudflare Workers with Static Assets**. The Worker configuration (`wrangler.jsonc`) is committed to the repo, and a push to `main` triggers an automatic build in about 30 seconds. An `.assetsignore` file keeps repo internals (`.git/`, `docs/`, this README, the Claude operating notes, the wrangler config itself) out of the public asset bundle.

## What's in the repo

```
/index.html                   Homepage — featured opener + illustrated 2-col card grid
/about.html                   About page
/archive.html                 Full archive, year-grouped, with faceted browsing
/categories/<cat>.html        One page per category
/posts/<slug>.html            Individual essays — one file per post
/assets/css/style.css         Single stylesheet (Manrope, white + editorial blue)
/assets/images/               Author portrait + hero images for each post
/wrangler.jsonc               Cloudflare Worker configuration
/.assetsignore                What to exclude from the public deploy
/docs/superpowers/            Specs and implementation plans
```

## Working with the site

### Preview locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. No install step. Refresh after each edit.

### Deploy

Push to `main`. Cloudflare Workers builds and deploys automatically. The Cloudflare dashboard shows the build log; the live site at <https://awonderfullife.ca> updates within ~30 seconds. No automated tests — verification is visual.

### Adding a new post

There is no build system, so a new post means updating it in four files plus several additional steps:

1. Create `posts/<slug>.html` (copy an existing post in the same category as the template). Include `· N MIN READ` in the byline (words ÷ 200) and a `<nav class="post-nav">` footer block.
2. Add the post as the new featured opener in `index.html` (the previous featured post moves down into the card grid as the first card).
3. Add a row to the correct year in `archive.html`.
4. Add a row to `categories/<category>.html`.
5. **Update neighboring posts' `post-nav` blocks.** The post that was previously newest gets a "next" link added; the post immediately before the new one gets a "previous" update.
6. **Compute the `· N MIN READ` byline** — count the post's words and divide by 200.

Generate a hero illustration via `docs/superpowers/tools/gen-hero.sh <slug> "<subject prompt>" <seed>` (credentials at `$HOME/.cloudflare_ai_token` and `$HOME/.cloudflare_ai_account`, never committed). Add a manifest row in `docs/superpowers/specs/2026-06-11-image-manifest.md` with the seed, prompt, and alt text. Target file size ≤200KB; the generated illustrations average ~95KB.

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
