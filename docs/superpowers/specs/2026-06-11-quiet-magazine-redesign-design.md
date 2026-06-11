# Quiet Magazine Redesign — Design Spec

**Date:** 2026-06-11
**Status:** Approved (brainstorm with Vijay)
**Scope type:** Visual refresh + layout rework + full hero-imagery replacement. Copy, page set, URLs, and post content unchanged.

## Goal

Modernize awonderfullife.ca while staying loyal to the identity chosen in the May 2026 editorial redesign — Manrope, crispness over decoration, print-like restraint. The site modernizes through typography, composition, and (above all) imagery: the random Picsum stand-ins are replaced by a cohesive AI-generated editorial-illustration series matched to each post's actual subject.

## Decisions made (with Vijay, in order)

1. **"Take a crack at it"** — design judgment delegated; copy untouched (it's his writing).
2. **All posts need the best appropriate pictures** — topical, not random.
3. **Sourcing: AI-generated, not stock/Commons.** Vijay first suggested sketches to dodge copyright; corrected (sketches aren't copyright-free), then explicitly chose generation over sourcing.
4. **Direction: A — Quiet Magazine** (over a Soft Modern transplant and a Bold Broadsheet direction).
5. **Imagery: one consistent editorial-illustration series**, symbolic scenes with **no face likenesses** for real-people posts; every image visually QC'd before shipping.

## Current state (verified)

- 24 pages: `index.html`, `about.html`, `archive.html`, 5 `categories/*.html`, 16 `posts/*.html`.
- `assets/css/style.css` — 421 lines, Manrope 400–700, kicker + post-hero pattern.
- 16 heroes exist at `assets/images/posts/<post-slug>.jpg` (1600×900 Picsum stand-ins, ~3.1MB total) — **filenames match post slugs**, so image replacement requires no HTML path changes.
- Deploy: Cloudflare Workers static assets, repo `vijaybpanangi/awonderfullife`, `.assetsignore` excludes docs/git.
- No build system, no test framework. Inline JS: none on this site.

## Design

### Typography & feel

- Manrope stays; extend the Google Fonts link to include weight 800 (display).
- Post H1: `clamp(2.2rem, 5vw, 3.2rem)`, tight leading, -0.02em tracking.
- Body: 17px (posts may compute to ~17.5–18px via rem scale), line-height ~1.75, measure capped ~68ch.
- Warm off-white page, near-black ink (`--color-text: #111`), single restrained accent: the existing `--color-accent: #0a4a9a` deep blue stays (kickers, links); the warm terracotta of the illustration palette is allowed ONLY inside imagery, never as UI chrome — keeping the interface cool/print-like against warm art.
- `--max-width` widens from 800px to 1080px for the home/category grids; the post text column itself stays at a ~68ch reading measure (the hero breaks out beyond it).
- No glass, no gradients, no scroll-triggered motion. Hover-only card lift, behind `prefers-reduced-motion`.

### Page composition

| Page | Treatment |
|---|---|
| Home | **Featured opener** = newest post: large illustration, kicker, title, excerpt, byline. Remaining 15 posts in a **two-column card grid** (image top, kicker, title, date · reading time). Single column ≤700px. |
| Posts | Hero breaks out wider than the text column (breakout width ~ +12-16% each side on desktop, full column on mobile). Byline gains `· N min read`. New **previous / next** post footer nav, chronological across all 16 posts, statically baked. |
| Categories (5) | Same card grid as home, no featured slot. |
| Archive | Year-grouped text list stays; inherits type polish only. |
| About | Type polish; `vijay.jpg` gets the same rounded/treated image frame as post imagery. |

### The illustration series

- **Style constant (every prompt):** flat editorial illustration, muted warm palette (terracotta / slate blue / cream), subtle paper-grain texture, minimal composition, no text, no lettering.
- **16 bespoke prompts**, one per post, derived from the post's actual subject (the plan enumerates all 16).
- **Real-people posts use symbolic scenes, zero face likenesses:** Tata tribute (e.g., Gateway of India, paper boats), Trump/Harris debate (two empty podiums), election pieces (ballot/Capitol motifs), Ratan-Tata-style memorials likewise.
- **Generation pipeline:** Pollinations API (keyless, Flux-based) via `curl` — `https://image.pollinations.ai/prompt/<urlencoded>?width=1600&height=900&model=flux&nologo=true&seed=<n>`. Each image is **visually inspected by Claude** (Read tool renders images); weak results regenerated with adjusted prompt/seed until the image earns its slot. QC criteria: subject match, series-consistent palette/style, no text artifacts, no faces on people-posts, no AI mangling.
- **Output:** overwrite `assets/images/posts/<slug>.jpg` in place (same filenames → zero HTML path edits), 16:9, target <300KB each (compress via available tooling; check for ImageMagick/cwebp at plan time, fall back to API-size tuning).
- **Alt text rewritten** per image to describe the actual illustration (closes the ROADMAP "simplify alt-text" item).
- Optional caption credit line is NOT used — generated illustrations need no attribution; post pages stay clean.

### Mechanics

- **Reading time:** computed once per post (`words ÷ 200`, rounded up, min 1) and baked into the byline HTML. No JS.
- **Prev/next:** chronological order derived from the dates already in post bylines; each post footer gets two links (older / newer), statically written.
- **No build system added.** No JS added. CSS reworked in place under its existing organization.

## Out of scope (stays on ROADMAP)

- `.html` suffix removal from internal links
- `www → apex` canonical redirect
- Dark mode
- Any copy/content edits

## Workflow & verification

- Branch `redesign/quiet-magazine` → PR → **Vijay's merge call** (PR-by-default policy).
- No test framework: verification = local `http.server` visual pass over all 24 pages at 3 viewports, image QC log (one line per accepted image), `prefers-reduced-motion` check, then Workers preview/live spot-check after merge.
- gh CLI note: PR creation/merge on this personal repo requires `gh auth switch --user vijaybpanangi` (work account lacks permission); switch back after.
