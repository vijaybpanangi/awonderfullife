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

Plain static HTML and one CSS file. No framework, no bundler, no build step. The site was originally a generic blog template and was rebuilt in May 2026 into an editorial design — Manrope typography, hero photography on every post, a thumbnail-led homepage, a year-grouped archive, and a faceted-browsing layer that lets readers move between categories or jump to a year.

Deployment is on **Cloudflare Workers with Static Assets**. The Worker configuration (`wrangler.jsonc`) is committed to the repo, and a push to `main` triggers an automatic build in about 30 seconds. An `.assetsignore` file keeps repo internals (`.git/`, `docs/`, this README, the Claude operating notes, the wrangler config itself) out of the public asset bundle.

## What's in the repo

```
/index.html                   Homepage — thumbnail list of all posts (newest first)
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

There is no build system, so a new post means updating it in three places (sometimes four):

1. Create `posts/<slug>.html` (copy an existing post in the same category as the template).
2. Add a row to the top of `index.html`'s post list (newest first).
3. Add a row to the correct year in `archive.html`.
4. Add a row to `categories/<category>.html`.

Drop a hero image at `assets/images/posts/<slug>.jpg`. Recommended dimensions: ~1600×900 (16:9), JPEG quality 80, target ≤200KB.

## Project documentation

- **`CLAUDE.md`** — operating notes for Claude Code sessions working in this repo (architecture, conventions, gotchas, deferred follow-ups).
- **`docs/superpowers/specs/`** — design specs for non-trivial changes.
- **`docs/superpowers/plans/`** — implementation plans matched to specs.
- **`CHANGELOG.md`** — curated trail of notable changes (design, infrastructure, documentation).
- **`ROADMAP.md`** — future updates and deferred items (curated photography, email migration, canonical-URL redirect, alt-text simplification, drop `.html` from internal links).

Anything more substantial than a copy edit goes through a brainstorm → spec → plan → execute workflow; see `docs/superpowers/README.md` for that convention.

## Recent updates

| Date | Area | What changed |
|---|---|---|
| 2026-05-28 | Documentation | `ROADMAP.md` added; README/CLAUDE updated to cross-link it |
| 2026-05-28 | Infrastructure | `www.awonderfullife.ca` added as a second Custom Domain on the Worker (was returning 522); stale `www` CNAME removed from DNS |
| 2026-05-28 | Documentation | `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `docs/superpowers/README.md` added so the repo home reads well on GitHub |
| 2026-05-27 | Redesign | Full editorial direction shipped — Manrope typography, hero photography, faceted category browsing, post-body cleanup, 800px container (17 commits) |

Full chronological log lives in [`CHANGELOG.md`](CHANGELOG.md); planned work lives in [`ROADMAP.md`](ROADMAP.md).
