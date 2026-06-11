# Quiet Magazine Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Quiet Magazine redesign of awonderfullife.ca (spec: `docs/superpowers/specs/2026-06-11-quiet-magazine-redesign-design.md`) — featured-post home, illustrated card grids, breakout post heroes, reading times, prev/next nav — and replace all 16 Picsum stand-in heroes with an AI-generated editorial-illustration series.

**Architecture:** Plain HTML + one CSS file, no build system. CSS reworked in place (`assets/css/style.css`, 421 lines). Images generated via Cloudflare Workers AI (`@cf/black-forest-labs/flux-1-schnell`, proven working: HTTP 200, native 1600×896, ~1.6s/image) through a small helper script, **overwriting the existing filenames** in `assets/images/posts/` so post/HTML paths never change. Every image is visually QC'd (Read tool renders images) before acceptance.

**Tech Stack:** HTML/CSS, bash + curl + python3/Pillow (12.2.0 confirmed installed), Cloudflare Workers AI REST. Deploy: Cloudflare Workers static assets auto-deploy from `main`; work lands on branch `redesign/quiet-magazine` → PR → Vijay merges.

**Secrets:** API token at `$HOME/.cloudflare_ai_token`, account ID at `$HOME/.cloudflare_ai_account` (both already in place, chmod 600, OUTSIDE the repo). The helper script reads them from `$HOME`; neither value may ever appear in a tracked file, a commit, or a log line.

**Verification model:** No tests exist. Each task ends with concrete grep/curl/visual checks. Run the preview server once and leave it running: `cd /home/vpanangipally/workshop/awonderfullife && python3 -m http.server 8100`

**Repo root for all paths:** `/home/vpanangipally/workshop/awonderfullife`

---

## Reference A — Canonical post order (newest → oldest; ties broken by current index.html order)

| # | Slug | Date | Category |
|---|---|---|---|
| 1 | finding-stability-in-unfinished-work-a-guide-to-endurance | Feb 18, 2026 | Reflection |
| 2 | data-dilemma-starving-for-truth-in-a-sea-of-misinformation | Mar 04, 2025 | Society |
| 3 | siris-major-ai-overhaul-features-of-ios-18-5-you-need-to-know | Mar 03, 2025 | Technology |
| 4 | the-united-states-and-canada-uneasy-neighbors-shared-failures | Nov 18, 2024 | Politics |
| 5 | india-and-pakistan-twin-dreams-divided-bound-by-hope | Nov 18, 2024 | Society |
| 6 | fostering-unity-in-canada-combating-divisive-rhetoric | Nov 07, 2024 | Politics |
| 7 | 2024-election-results-a-call-for-change | Nov 06, 2024 | Politics |
| 8 | apple-intelligence-ai-for-us-everyday-users | Oct 29, 2024 | Technology |
| 9 | dream-big-transforming-education-for-every-child | Oct 09, 2024 | Society |
| 10 | how-integrity-and-empathy-define-us | Oct 09, 2024 | Reflection |
| 11 | ratan-tata-the-giant-who-wore-his-greatness-lightly | Oct 09, 2024 | Reflection |
| 12 | leadership-contrasts-in-u-s-election-a-canadians-view-on-global-impact | Sep 11, 2024 | Politics |
| 13 | trump-vs-harris-policy-strategy-and-leadership-in-u-s-presidential-debate | Sep 11, 2024 | Politics |
| 14 | whispers-of-wanderlust-an-eco-friendly-journey-across-canada | Mar 15, 2024 | Travel |
| 15 | an-ode-to-winter-discovering-unforeseen-charms-in-torontos-embrace | Mar 14, 2024 | Travel |
| 16 | wanderlust-diaries-journeys-beyond-borders | Mar 14, 2024 | Travel |

Prev/next: for post #N, "Newer" links to #N−1, "Older" links to #N+1. Post #1 has only Older; post #16 has only Newer.

## Reference B — The 16 illustration prompts

Every generation appends the series style constant (it lives in the helper script):
`flat editorial illustration, muted warm palette of terracotta, slate blue and cream, subtle paper grain texture, minimal composition, generous negative space, no text, no lettering, no signage`

| # | Slug | Subject prompt | Start seed |
|---|---|---|---|
| 1 | finding-stability-in-unfinished-work-a-guide-to-endurance | a half-built stone bridge over a calm river with gentle scaffolding, a small figure standing steady at the unfinished edge in warm lantern light | 11 |
| 2 | data-dilemma-starving-for-truth-in-a-sea-of-misinformation | a lone figure in a small rowboat on a dark sea of crumpled paper waves, one warm lighthouse beam crossing the water | 13 |
| 3 | siris-major-ai-overhaul-features-of-ios-18-5-you-need-to-know | a soft glowing voice waveform orb floating above an open palm, gentle concentric light rings | 17 |
| 4 | the-united-states-and-canada-uneasy-neighbors-shared-failures | two porch chairs facing slightly apart on either side of a low fence along an endless shared road, brooding sky | 19 |
| 5 | india-and-pakistan-twin-dreams-divided-bound-by-hope | two kites, one green and one saffron, with tangled strings flying above a long wall at sunset | 23 |
| 6 | fostering-unity-in-canada-combating-divisive-rhetoric | many different hands together lifting one large maple leaf against a soft sky | 29 |
| 7 | 2024-election-results-a-call-for-change | a single ballot box on a long empty road at dawn, faint capitol dome on the far horizon | 31 |
| 8 | apple-intelligence-ai-for-us-everyday-users | a smartphone on a kitchen table radiating soft helpful light, morning coffee cup beside it, cozy domestic scene | 37 |
| 9 | dream-big-transforming-education-for-every-child | a child standing on a stack of large books reaching for a paper airplane climbing into a bright sky | 41 |
| 10 | how-integrity-and-empathy-define-us | two figures sharing one umbrella in soft rain under a warm streetlamp on an empty street | 43 |
| 11 | ratan-tata-the-giant-who-wore-his-greatness-lightly | the Gateway of India monument at dusk with small paper boats drifting on calm water, one empty bench facing the sea | 47 |
| 12 | leadership-contrasts-in-u-s-election-a-canadians-view-on-global-impact | a chessboard with two contrasting king pieces seen from above on a map-like table, a single maple leaf resting at the board's edge | 53 |
| 13 | trump-vs-harris-policy-strategy-and-leadership-in-u-s-presidential-debate | two empty debate podiums facing each other under crossing stage spotlights in a dark hall | 59 |
| 14 | whispers-of-wanderlust-an-eco-friendly-journey-across-canada | a cyclist on a misty forest highway between tall pines, distant blue mountains, soft morning light | 61 |
| 15 | an-ode-to-winter-discovering-unforeseen-charms-in-torontos-embrace | a red vintage streetcar on a quiet snowy city street at dusk, warm shop windows glowing | 67 |
| 16 | wanderlust-diaries-journeys-beyond-borders | a worn suitcase with plain unmarked travel patches standing on an empty train platform at golden hour | 71 |

**QC criteria (every image must pass all):** subject clearly matches the post's topic · style consistent with the series (flat, muted terracotta/slate/cream, grainy) · no readable or gibberish text/signage · no human face likenesses on posts 11 and 13 (symbolic only) · no AI artifacts (mangled limbs/geometry) · file <300KB after compression (≤350KB acceptable if a retry would sacrifice a clearly superior composition). On failure: retry same prompt with seed+2, or sharpen the prompt wording. Log every accepted image in the manifest (Task 2 defines it).

---

### Task 1: Helper script + manifest scaffold

**Files:**
- Create: `docs/superpowers/tools/gen-hero.sh`
- Create: `docs/superpowers/specs/2026-06-11-image-manifest.md`

- [ ] **Step 1: Create the generator script**

Write `docs/superpowers/tools/gen-hero.sh` (the `docs/` tree is already excluded from public deploy by `.assetsignore`):

```bash
#!/usr/bin/env bash
# Generate one post hero via Cloudflare Workers AI (flux-1-schnell).
# Usage: docs/superpowers/tools/gen-hero.sh <slug> "<subject prompt>" <seed>
# Reads credentials from $HOME (never from the repo). Writes assets/images/posts/<slug>.jpg
set -euo pipefail
SLUG="$1"; PROMPT="$2"; SEED="${3:-7}"
STYLE="flat editorial illustration, muted warm palette of terracotta, slate blue and cream, subtle paper grain texture, minimal composition, generous negative space, no text, no lettering, no signage"
TOKEN=$(cat "$HOME/.cloudflare_ai_token"); ACCT=$(cat "$HOME/.cloudflare_ai_account")
TMP=$(mktemp)
python3 -c 'import json,sys; print(json.dumps({"prompt": sys.argv[1]+", "+sys.argv[2], "steps": 8, "seed": int(sys.argv[3]), "width": 1600, "height": 896}))' \
  "$PROMPT" "$STYLE" "$SEED" > "$TMP.req"
curl -s --max-time 120 -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${ACCT}/ai/run/@cf/black-forest-labs/flux-1-schnell" \
  -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  --data @"$TMP.req" -o "$TMP"
python3 - "$TMP" "assets/images/posts/${SLUG}.jpg" <<'PY'
import json, base64, sys, io
from PIL import Image
d = json.load(open(sys.argv[1]))
if not d.get("success"):
    raise SystemExit(f"API error: {d.get('errors')}")
img = Image.open(io.BytesIO(base64.b64decode(d["result"]["image"]))).convert("RGB")
img.save(sys.argv[2], "JPEG", quality=80, optimize=True, progressive=True)
PY
rm -f "$TMP" "$TMP.req"
ls -la "assets/images/posts/${SLUG}.jpg"
```

Then: `chmod +x docs/superpowers/tools/gen-hero.sh`

- [ ] **Step 2: Smoke-test the script** (overwrites one stand-in; that's fine — it gets its real generation in Task 3)

Run from repo root:
```bash
docs/superpowers/tools/gen-hero.sh wanderlust-diaries-journeys-beyond-borders "a worn suitcase with plain unmarked travel patches standing on an empty train platform at golden hour" 71
```
Expected: `ls -la` line showing the jpg, file size roughly 80–350KB. Then verify with the Read tool that the image renders and looks like the series style.

- [ ] **Step 3: Create the manifest**

`docs/superpowers/specs/2026-06-11-image-manifest.md` starting with:

```markdown
# Generated hero manifest — Quiet Magazine series

One row per ACCEPTED image. QC criteria live in the plan (Reference B).

| # | Slug | Seed | Subject prompt (final wording) | Alt text (for the post hero) | KB |
|---|---|---|---|---|---|
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/tools/gen-hero.sh docs/superpowers/specs/2026-06-11-image-manifest.md assets/images/posts/wanderlust-diaries-journeys-beyond-borders.jpg
git commit -m "Add Workers AI hero generator script + image manifest scaffold"
```

---

### Tasks 2–5: Generate + QC the 16 heroes (4 batches of 4)

**Files per batch:** overwrite 4 of `assets/images/posts/<slug>.jpg`; append 4 rows to `docs/superpowers/specs/2026-06-11-image-manifest.md`.

- **Task 2:** posts #1–4 of Reference B. — **Task 3:** posts #5–8 (plus regenerate #16 from the smoke test if it failed QC). — **Task 4:** posts #9–12. — **Task 5:** posts #13–16.

For EACH image in the batch:

- [ ] **Step 1: Generate** — `docs/superpowers/tools/gen-hero.sh <slug> "<subject prompt from Reference B>" <start seed>`
- [ ] **Step 2: Inspect visually** — use the Read tool on `assets/images/posts/<slug>.jpg`. Judge against the QC criteria in Reference B.
- [ ] **Step 3: Retry if failed** — same prompt seed+2, or adjust wording (keep the change minimal; record final wording). Repeat until pass. If 5 attempts fail, mark DONE_WITH_CONCERNS and note the best candidate.
- [ ] **Step 4: Write the manifest row** — including a one-sentence **alt text describing the actual accepted illustration** (e.g. "Flat illustration of a red streetcar on a snowy street at dusk, in muted terracotta and slate blue"). This alt text is consumed by Task 9.

Batch close:

- [ ] **Step 5: Verify sizes** — `du -k assets/images/posts/<slug1>.jpg ...` each ≤ ~350KB, and `file` reports JPEG 1600x896.
- [ ] **Step 6: Commit** — `git add assets/images/posts/ docs/superpowers/specs/2026-06-11-image-manifest.md && git commit -m "Generate series heroes batch N (posts X-Y) with QC manifest"`

---

### Task 6: CSS — tokens, type scale, wide container, featured + card grid

**Files:**
- Modify: `assets/css/style.css`

- [ ] **Step 1: Tokens** — in `:root` add after `--max-width: 800px;`:

```css
  --max-width-wide: 1080px;
```

- [ ] **Step 2: Wide container variant** — after the `.container` rule (~line 51) add:

```css
.container--wide { max-width: var(--max-width-wide); }
```

- [ ] **Step 3: Featured + card grid components** — add a new banner section after the `/* Homepage post list (thumbnail + text) */` block (keep the old `.post-list`/`.post-item` rules during this task; they're deleted in Task 11 cleanup):

```css
/* Featured post (homepage opener) */
.featured { margin-bottom: 3.5rem; }
.featured-link { display: block; color: inherit; }
.featured-link:hover { text-decoration: none; }
.featured img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 1.25rem;
}
.featured .post-title {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  letter-spacing: -0.03em;
  margin-bottom: 0.6rem;
}
.featured-link:hover .post-title { color: var(--color-accent); }
.featured .post-excerpt { font-size: 1.05rem; max-width: 62ch; }

/* Illustrated card grid (home + category pages) */
.card-grid {
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.75rem 2rem;
}
.card-link { display: block; color: inherit; }
.card-link:hover { text-decoration: none; }
.card img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 0.9rem;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.card-link:hover img {
  transform: translateY(-3px);
  box-shadow: 0 10px 28px rgba(17, 17, 17, 0.12);
}
.card .post-title { font-size: 1.25rem; margin-bottom: 0.35rem; }
.card-link:hover .post-title { color: var(--color-accent); }
.card .post-excerpt { font-size: 0.92rem; margin-bottom: 0.5rem; }

@media (max-width: 700px) {
  .card-grid { grid-template-columns: 1fr; gap: 2.25rem; }
}
@media (prefers-reduced-motion: reduce) {
  .card img { transition: none; }
  .card-link:hover img { transform: none; box-shadow: none; }
}
```

- [ ] **Step 4: Verify + commit** — `grep -c 'card-grid\|featured-link\|container--wide' assets/css/style.css` ≥ 6; CSS braces balanced (`python3 -c "s=open('assets/css/style.css').read(); print(s.count('{'), s.count('}'))"` — equal counts).

```bash
git add assets/css/style.css && git commit -m "CSS: wide container, featured opener, illustrated card grid"
```

---

### Task 7: CSS — post page (display H1, breakout hero, reading time, prev/next)

**Files:**
- Modify: `assets/css/style.css`

- [ ] **Step 1: Post H1 scale** — in `/* Single post page */`, change `.post-header h1` to:

```css
.post-header h1 {
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
  margin-bottom: 0.6rem;
}
```

- [ ] **Step 2: Breakout hero** — replace the `.post-hero` rule with:

```css
.post-hero {
  --breakout: clamp(0px, calc((100vw - var(--max-width)) / 2 - 1.5rem), 140px);
  width: calc(100% + var(--breakout) * 2);
  max-width: none;
  margin-left: calc(var(--breakout) * -1);
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  margin-top: 1.5rem;
  margin-bottom: 2rem;
  border-radius: 4px;
}
```

(`--breakout` collapses to 0 below ~848px viewports, so mobile is untouched.)

- [ ] **Step 3: Post body scale** — in `.post-content` change `font-size: 1.05rem;` → `font-size: 1.125rem;` (line-height stays 1.8).

- [ ] **Step 4: Prev/next nav component** — add a new banner section after the `/* Single post page */` block:

```css
/* Post footer prev/next navigation */
.post-nav {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  margin-top: 3.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}
.post-nav-link { display: flex; flex-direction: column; gap: 0.25rem; max-width: 46%; color: inherit; }
.post-nav-link:hover { text-decoration: none; }
.post-nav-next { margin-left: auto; text-align: right; }
.post-nav-label {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-light);
}
.post-nav-title { font-weight: 600; line-height: 1.3; }
.post-nav-link:hover .post-nav-title { color: var(--color-accent); }
@media (max-width: 640px) {
  .post-nav { flex-direction: column; }
  .post-nav-link { max-width: 100%; }
  .post-nav-next { margin-left: 0; text-align: left; }
}
```

- [ ] **Step 5: Verify + commit** — brace balance check again; open `http://localhost:8100/posts/ratan-tata-the-giant-who-wore-his-greatness-lightly.html` at desktop width: hero extends beyond the text column; H1 noticeably larger.

```bash
git add assets/css/style.css && git commit -m "CSS: display post titles, breakout hero, post-nav component"
```

---

### Task 8: Home page — featured opener + card grid

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Widen the main container** — `<main class="container">` → `<main class="container container--wide">`.

- [ ] **Step 2: Replace the `<ul class="post-list">` block.** Post #1 (Reference A) becomes the featured opener; posts #2–16 become cards. ALL kicker hrefs, post hrefs, titles, excerpts, and dates are MOVED VERBATIM from the existing list items — zero copy edits. Thumbnails/cards use `alt=""` (decorative; the adjacent title carries the meaning). Featured structure:

```html
<section class="featured">
  <a class="kicker" href="categories/reflection.html">Reflection</a>
  <a class="featured-link" href="posts/finding-stability-in-unfinished-work-a-guide-to-endurance.html">
    <img src="assets/images/posts/finding-stability-in-unfinished-work-a-guide-to-endurance.jpg" alt="">
    <h2 class="post-title">[existing title verbatim]</h2>
  </a>
  <p class="post-excerpt">[existing excerpt verbatim]</p>
  <p class="post-date">FEBRUARY 18, 2026 · [N] MIN READ</p>
</section>
```

Card structure (×15, in Reference A order #2–16):

```html
<li class="card">
  <a class="kicker" href="categories/[cat].html">[Category]</a>
  <a class="card-link" href="posts/[slug].html">
    <img src="assets/images/posts/[slug].jpg" alt="" loading="lazy">
    <h2 class="post-title">[existing title verbatim]</h2>
  </a>
  <p class="post-excerpt">[existing excerpt verbatim]</p>
  <p class="post-date">[EXISTING DATE] · [N] MIN READ</p>
</li>
```

wrapped in `<ul class="card-grid">…</ul>`. Reading-time values `[N]` come from Task 9 Step 1's computation — run that command first and use its numbers here too.

- [ ] **Step 3: Verify + commit** — `curl -s http://localhost:8100/ | grep -c 'card-link'` → 15; `grep -c 'featured-link' index.html` → 1; word-diff shows no copy changes beyond the `· N MIN READ` additions.

```bash
git add index.html && git commit -m "Home: featured opener + illustrated card grid (copy verbatim)"
```

---

### Task 9: Posts ×16 — reading time, prev/next, alt text

**Files:**
- Modify: all 16 `posts/*.html`

- [ ] **Step 1: Compute reading times** (once, save the output):

```bash
for f in posts/*.html; do python3 - "$f" <<'PY'
import sys, re, math
t = open(sys.argv[1]).read()
m = re.search(r'<div class="post-content">(.*)</article>', t, re.S)
words = len(re.sub(r'<[^>]+>', ' ', m.group(1)).split())
print(f"{sys.argv[1]}  {words}w  {max(1, math.ceil(words/200))} min")
PY
done
```

- [ ] **Step 2: Bylines** — in each post, append the reading time to the byline: `<p class="post-byline">VIJAY PANANGIPALLY · OCTOBER 09, 2024</p>` → `…OCTOBER 09, 2024 · 4 MIN READ</p>` (uppercase, same format as shown).

- [ ] **Step 3: Hero alt text** — each post's `<img class="post-hero" … alt="[post title]">` gets its alt replaced with the **manifest alt text** for that slug (from `docs/superpowers/specs/2026-06-11-image-manifest.md`).

- [ ] **Step 4: Prev/next nav** — insert immediately after the closing `</div>` of `post-content`, inside `</article>`, using Reference A ordering:

```html
<nav class="post-nav" aria-label="More posts">
  <a class="post-nav-link post-nav-prev" href="[older-slug].html">
    <span class="post-nav-label">← Older</span>
    <span class="post-nav-title">[older post title]</span>
  </a>
  <a class="post-nav-link post-nav-next" href="[newer-slug].html">
    <span class="post-nav-label">Newer →</span>
    <span class="post-nav-title">[newer post title]</span>
  </a>
</nav>
```

Post #1 omits the `post-nav-next` link; post #16 omits `post-nav-prev`. (Links are sibling files — plain `[slug].html`, no `../`.)

- [ ] **Step 5: Verify + commit** — `grep -L 'post-nav' posts/*.html` → empty; `grep -L 'MIN READ' posts/*.html` → empty; `grep -c 'alt=""' posts/*.html` → 0 for heroes (each post hero alt is descriptive); spot-open 3 posts in the browser, click through prev/next chain end to end.

```bash
git add posts/ && git commit -m "Posts: reading times, manifest alt text, prev/next navigation"
```

---

### Task 10: Category pages ×5 — card grids

**Files:**
- Modify: `categories/politics.html`, `categories/reflection.html`, `categories/society.html`, `categories/technology.html`, `categories/travel.html`

- [ ] **Step 1:** In each: `<main class="container">` → `<main class="container container--wide">`. Keep the `browse-title`, `browse-subtitle`, and the entire `.facets` strip EXACTLY as they are.
- [ ] **Step 2:** Replace each page's year-grouped `archive-year`/`archive-list` markup with one `<ul class="card-grid">` of that category's posts (Reference A order, newest first), using the same card structure as Task 8 Step 2 — except paths are from `categories/`: hrefs `../posts/[slug].html`, images `../assets/images/posts/[slug].jpg`, kickers omitted (the page IS the category). Dates include `· N MIN READ` (Task 9 Step 1 values). Excerpts: copy each post's excerpt verbatim from `index.html`.
- [ ] **Step 3: Verify + commit** — for each page `curl -s http://localhost:8100/categories/[cat].html | grep -c card-link` equals that category's post count (politics 5, reflection 3, society 3, technology 2, travel 3); facet chips still render.

```bash
git add categories/ && git commit -m "Categories: illustrated card grids, facets preserved"
```

---

### Task 11: About + archive polish, dead-CSS cleanup

**Files:**
- Modify: `about.html`, `assets/css/style.css`

- [ ] **Step 1: About photo treatment** — in `assets/css/style.css` `.about-photo`: `border-radius: 50%;` → `border-radius: 4px;` and `width: 150px; height: 150px;` → `width: 180px; height: 180px;` (squared editorial frame consistent with the imagery system).
- [ ] **Step 2: Delete dead homepage-list CSS** — remove the `.post-list`, `.post-item`, `.post-thumb`, `.post-item .post-body` rules AND the `.post-item`/`.post-thumb` lines inside the 640px media query (nothing references them after Task 8; `grep -rn 'post-item\|post-thumb' *.html categories/ posts/` must be empty FIRST — if not, stop and fix).
- [ ] **Step 3: Archive check** — open `http://localhost:8100/archive.html`: year-grouped list intact, facets intact (archive inherits type polish only; no edits expected).
- [ ] **Step 4: Verify + commit** — brace balance; about page renders with squared photo.

```bash
git add about.html assets/css/style.css && git commit -m "About photo editorial frame; prune dead post-list CSS"
```

---

### Task 12: Full verification sweep + fixes

- [ ] **Step 1: Automated sweep** — all 24 pages return 200 via curl; every page still links `assets/css/style.css`; `grep -rn 'picsum' *.html posts/ categories/ assets/` → empty; all 16 jpgs are `1600x896` (`file assets/images/posts/*.jpg`); total `du -sh assets/images/posts/` ≤ ~5MB; manifest has 16 rows.
- [ ] **Step 2: Visual matrix** — home, one category, three posts, about, archive at 375/768/1280px: featured opener composition, 2-col→1-col grid collapse, breakout hero (desktop only), prev/next chain, no horizontal scroll. Reduced-motion emulation: no card lift.
- [ ] **Step 3: Secret scan** — `git log -p --all | grep -c 'cfut_'` → 0 (the token never entered git), and `grep -rn 'cfut_' . --exclude-dir=.git` → 0.
- [ ] **Step 4: Fix anything found; commit** — `git add -A && git commit -m "Verification pass fixes"` (skip if clean).

---

### Task 13: Docs, push, PR

**Files:**
- Modify: `CHANGELOG.md`, `README.md`, `CLAUDE.md`, `ROADMAP.md`

- [ ] **Step 1: CHANGELOG.md** — new top section `## 2026-06-11 — Quiet Magazine redesign + generated illustration series`: design summary (featured home, card grids, breakout heroes, reading times, prev/next), the imagery story (16 AI-generated editorial illustrations via Cloudflare Workers AI flux-1-schnell, consistent series style, QC'd individually, manifest at the specs path, no-faces rule for people-posts), alt-text rewrite, spec/plan links.
- [ ] **Step 2: README.md** — Recent Updates row for 2026-06-11; refresh any styling/structure notes that mention the thumbnail list or Picsum.
- [ ] **Step 3: CLAUDE.md** — update: the "three-places rule" gains the prev/next note (a new post also updates its neighbor posts' nav); the hero-image paragraph now describes `docs/superpowers/tools/gen-hero.sh` usage (+ credentials at `$HOME/.cloudflare_ai_token` / `.cloudflare_ai_account`, never committed) instead of Picsum/Unsplash; stylesheet notes (new components, ~line count via `wc -l`); "Known follow-ups" section drops the two closed items (hero curation, alt text) keeping `.html`-suffix item.
- [ ] **Step 4: ROADMAP.md** — move "curate hero images" and "alt text simplification" to done/CHANGELOG reference; keep `.html` drop + www→apex.
- [ ] **Step 5: Push + PR** (gh note: this personal repo needs `gh auth switch --user vijaybpanangi` before PR ops; switch back to `vpanangipally` after):

```bash
git add CHANGELOG.md README.md CLAUDE.md ROADMAP.md
git commit -m "Docs: log Quiet Magazine redesign; refresh CLAUDE/ROADMAP for generated heroes"
git push -u origin redesign/quiet-magazine
gh auth switch --user vijaybpanangi
gh pr create --title "Quiet Magazine redesign + generated illustration series" --body "$(cat <<'EOF'
## Summary
- Implements the approved Quiet Magazine design (spec + plan in docs/superpowers/)
- Home: featured opener + illustrated 2-col card grid; categories: card grids (facets preserved)
- Posts: display-scale titles, breakout heroes, reading times, prev/next navigation
- All 16 Picsum stand-ins replaced by a cohesive AI-generated editorial-illustration series
  (Cloudflare Workers AI flux-1-schnell, free tier; per-image visual QC; manifest in docs/superpowers/specs/)
- People-posts use symbolic scenes, no face likenesses; alt text rewritten to describe each illustration
- Copy untouched; URLs untouched

## Verification
- 24-page sweep (HTTP 200, no picsum refs, image dims/sizes), 3-viewport visual pass, reduced-motion pass, secret scan (token never in git)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh auth switch --user vpanangipally
```

Expected: PR URL. Vijay reviews the Workers preview & merges.

---

## Plan self-review notes

- **Spec coverage:** typography/type scale (T6/T7), featured+grid home (T6/T8), categories (T10), breakout hero + reading time + prev/next (T7/T9), archive-stays-austere (T11 check), about photo (T11), illustration series + QC + manifest + no-faces (Ref B, T1–T5), alt-text rewrite (T9, closes ROADMAP item), cool-UI/warm-art split (no new accent colors introduced in CSS tasks), hover-only motion + reduced-motion (T6), out-of-scope respected (no URL/copy changes), PR workflow + gh account note (T13), secrets handling (header + T12 scan).
- **Feasibility pre-proven by controller:** Workers AI 200 OK at 1600×896, style probe visually validated, Pillow 12.2.0 present, ~1.6s/generation, free-tier neuron budget ample for ≤80 generations.
- **Type consistency:** class names used in HTML tasks (`featured`, `featured-link`, `card-grid`, `card`, `card-link`, `post-nav`, `post-nav-link/-prev/-next/-label/-title`, `container--wide`) all defined in T6/T7. Reading-time format `· N MIN READ` identical in T8/T9/T10.
- **Verbatim-move convention:** titles/excerpts/dates move from existing files; the plan deliberately doesn't reprint 16 titles+excerpts (they live in the files being edited; transcription would add risk).
