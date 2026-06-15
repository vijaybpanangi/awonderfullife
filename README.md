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

## Recent updates

| Date | Area | What changed |
|---|---|---|
| 2026-06-15 | 🏷 v2.4.0 | Liquid Glass editorial accents — frosted sticky header, glassy newsletter + browse chips |
| 2026-06-15 | 🏷 v2.3.0 | Email live via iCloud+ Custom Email Domain (+ `v2.3.1`: contact email `v@` surfaced on About + Person JSON-LD) |
| 2026-06-15 | 🏷 v2.2.0 | Technical SEO foundation — canonical, Open Graph/Twitter, JSON-LD, sitemap, robots (+ `v2.2.1` email DNS checker) |
| 2026-06-13 | 🏷 v2.1.0 | API spine (Phase 1) — `api.awonderfullife.ca` (D1 + Cloudflare Access) |
| 2026-06-11 | 🏷 v2.0.0 | Quiet Magazine redesign: featured homepage, illustrated card grids, display-scale post titles, prev/next nav, 16 AI-generated heroes replacing Picsum stand-ins |
| 2026-05-28 | 🏷 Release | [`v1.0.0` — Editorial direction launch](https://github.com/vijaybpanangi/awonderfullife/releases/tag/v1.0.0) cut as the first formal milestone |
| 2026-05-28 | Documentation | GitHub [Wiki](https://github.com/vijaybpanangi/awonderfullife/wiki) populated with twelve pages plus sidebar — long-form companion to the in-repo docs |
| 2026-05-28 | Documentation | `ROADMAP.md` added; README/CLAUDE updated to cross-link it |
| 2026-05-28 | Infrastructure | `www.awonderfullife.ca` added as a second Custom Domain on the Worker (was returning 522); stale `www` CNAME removed from DNS |
| 2026-05-28 | Documentation | `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `docs/superpowers/README.md` added so the repo home reads well on GitHub |
| 2026-05-27 | Redesign | Full editorial direction shipped — Manrope typography, hero photography, faceted category browsing, post-body cleanup, 800px container (17 commits) |

Full chronological log lives in [`CHANGELOG.md`](CHANGELOG.md); planned work lives in [`ROADMAP.md`](ROADMAP.md).
