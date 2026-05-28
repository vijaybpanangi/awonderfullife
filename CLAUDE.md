# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal essay blog of Vijay Panangipally, tagline *"Data, life, and the space between."* Sixteen posts as of this writing, spanning Reflection, Society, Politics, Technology, and Travel. The site was redesigned in May 2026 from a generic Medium-lite look into an editorial direction with hero photography, Manrope typography, and faceted browsing (see `docs/superpowers/specs/2026-05-27-website-redesign-design.md` for the locked-in design decisions and `docs/superpowers/plans/2026-05-27-website-redesign.md` for the original implementation plan).

## Build, run, deploy

There is no build system. No `package.json`, no bundler, no test framework. Edits are made directly to HTML/CSS files.

- **Live site:** <https://awonderfullife.ca> — Cloudflare Workers with Static Assets auto-deploys from `main` on every push (config lives in `wrangler.jsonc`; the Pages-style integration was set up via the Cloudflare GitHub PR).
- **Preview locally:** `python3 -m http.server 8000` from the repo root, open `http://localhost:8000/`.
- **Verify a deploy:** after pushing, the Cloudflare dashboard shows the build, and the live site updates within ~30s. There are no automated tests; verification is visual.
- **Asset exclusion:** `.assetsignore` (gitignore-style) keeps repo internals (`.git/`, `.wrangler/`, `docs/`, `wrangler.jsonc`, this file, the README) out of the public asset bundle. When adding new private files, add them there too.

## The big picture: where content lives

```
/index.html                     Homepage — thumbnail list of all 16 posts (newest first)
/about.html                     About page (round portrait + prose)
/archive.html                   Year-grouped compact list of every post + faceted nav
/categories/<cat>.html          One page per category, year-grouped — same faceted nav
/posts/<slug>.html              Individual post (one file per post)
/assets/css/style.css           Single global stylesheet (~370 lines)
/assets/images/                 Author portrait + hero images for each post
/assets/images/posts/<slug>.jpg Hero image per post (currently Picsum stand-ins seeded by slug)
```

Five categories in active use: **Reflection** (3 posts), **Society** (3), **Politics** (5), **Technology** (2), **Travel** (3).

## Adding or modifying a post: the three-places rule

Because there is no build system, a new post means edits in **three** files (sometimes four):

1. `posts/<slug>.html` — the post itself. Open an existing post in the same category as a template; the structure is `<header class="post-header">` with `<a class="kicker">`, `<h1>`, `<p class="post-byline">`, then `<img class="post-hero">`, then `<div class="post-content">`.
2. `index.html` — add the post as the topmost `<li class="post-item">` (newest first). Each row is thumbnail + kicker + title + excerpt + date.
3. `archive.html` — add to the correct `<h1 class="archive-year">` section.
4. `categories/<category>.html` — add to that category's archive.

When a new post lands, also drop a hero image at `assets/images/posts/<slug>.jpg`. Picsum stand-ins are generated with a deterministic URL seeded by the slug; curated Unsplash replacements can be downloaded later by pointing curl at the Unsplash CDN with `?w=1600&q=80&fm=jpg&fit=crop`.

## Stylesheet (`assets/css/style.css`)

Single source of styling. Defines a small token palette in `:root`:

- `--color-bg` (`#ffffff`), `--color-text` (`#111111`), `--color-text-light` (`#666666`)
- `--color-border` (`#e5e5e5`), `--color-accent` (`#0a4a9a` editorial blue)
- `--color-bg-soft` (`#f9f9f9`) for newsletter card and code blocks
- `--max-width: 800px` — page container width (widened from 680px during the redesign)
- `--font: 'Manrope'` — loaded via Google Fonts `<link>` in each HTML file

Section banner comments delimit related rules (`/* Header */`, `/* Homepage post list */`, `/* Single post page */`, `/* Archive */`, `/* Faceted browsing strip */`, `/* Newsletter */`, etc.). Search for the banner of the area you're editing rather than scrolling.

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

## Known follow-ups deferred during the May 2026 redesign

- **Curate the hero images.** The 16 in `assets/images/posts/` are Picsum stand-ins. Replace with topical Unsplash photos when time permits.
- **Alt text simplification.** Thumbnail and hero `alt` attributes currently restate the post title. For better screen-reader UX, switch to `alt=""` (decorative) or describe the image content once curated photography lands.
- **Drop `.html` from internal links.** Cloudflare canonicalizes URLs without `.html` (e.g. `/archive` not `/archive.html`). Internal hrefs still use `.html`, so every click goes through one 301 hop. Cosmetic; low priority.
