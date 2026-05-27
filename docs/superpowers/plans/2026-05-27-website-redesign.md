# A Wonderful Life Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the static blog `awonderfullife/` with an Editorial visual direction — Manrope typography, crisp white + ink + editorial-blue palette, hero photography per post, a thumbnail-led homepage list, year-grouped archive, and a five-category taxonomy across all 16 posts.

**Architecture:** Plain static HTML edits. No build system, no JS framework. A single rewritten `assets/css/style.css` provides all layout. HTML files are touched in place. Hero images are downloaded once from the Unsplash CDN (pre-sized via URL params) into `assets/images/posts/<slug>.jpg`. Verification is grep-based for markup invariants plus visual browser checks via a local Python `http.server`.

**Tech Stack:** HTML5, CSS3 (custom properties, flexbox, media queries), Google Fonts (Manrope via `<link>`), Unsplash CDN imagery, bash + curl + grep for verification, `python3 -m http.server` for local preview.

**Spec:** [`docs/superpowers/specs/2026-05-27-website-redesign-design.md`](../specs/2026-05-27-website-redesign-design.md)

**Working branch:** `main` (personal blog, no PR review required; frequent commits to main).

---

## Post → Category → Date Map

This map is the source of truth for category assignments and archive grouping. Re-derive from the spec if conflicts appear.

| Slug | Date | Year | Category |
|---|---|---|---|
| `finding-stability-in-unfinished-work-a-guide-to-endurance` | February 18, 2026 | 2026 | Reflection |
| `data-dilemma-starving-for-truth-in-a-sea-of-misinformation` | March 04, 2025 | 2025 | Society |
| `siris-major-ai-overhaul-features-of-ios-18-5-you-need-to-know` | March 03, 2025 | 2025 | Technology |
| `the-united-states-and-canada-uneasy-neighbors-shared-failures` | November 18, 2024 | 2024 | Politics |
| `india-and-pakistan-twin-dreams-divided-bound-by-hope` | November 18, 2024 | 2024 | Society |
| `fostering-unity-in-canada-combating-divisive-rhetoric` | November 07, 2024 | 2024 | Politics |
| `2024-election-results-a-call-for-change` | November 06, 2024 | 2024 | Politics |
| `apple-intelligence-ai-for-us-everyday-users` | October 29, 2024 | 2024 | Technology |
| `dream-big-transforming-education-for-every-child` | October 09, 2024 | 2024 | Society |
| `how-integrity-and-empathy-define-us` | October 09, 2024 | 2024 | Reflection |
| `ratan-tata-the-giant-who-wore-his-greatness-lightly` | October 09, 2024 | 2024 | Reflection |
| `leadership-contrasts-in-u-s-election-a-canadians-view-on-global-impact` | September 11, 2024 | 2024 | Politics |
| `trump-vs-harris-policy-strategy-and-leadership-in-u-s-presidential-debate` | September 11, 2024 | 2024 | Politics |
| `whispers-of-wanderlust-an-eco-friendly-journey-across-canada` | March 15, 2024 | 2024 | Travel |
| `an-ode-to-winter-discovering-unforeseen-charms-in-torontos-embrace` | March 14, 2024 | 2024 | Travel |
| `wanderlust-diaries-journeys-beyond-borders` | March 14, 2024 | 2024 | Travel |

Counts: Reflection 3 · Society 3 · Politics 5 · Technology 2 · Travel 3 = **16 total**.

---

## File Structure

**Created:**
- `assets/images/posts/` — directory holding one `.jpg` per post (16 files).
- `assets/images/posts/<slug>.jpg` — hero image for each post, downloaded from Unsplash CDN at 1600px wide, JPEG q80.
- `docs/superpowers/plans/2026-05-27-website-redesign.md` — this file.

**Modified:**
- `assets/css/style.css` — full rewrite.
- `index.html` — full rewrite of `<main>` content; new `<link>` to Google Fonts in `<head>`.
- `about.html` — new `<link>` to Google Fonts in `<head>`; markup unchanged otherwise.
- `archive.html` — full rewrite of `<main>` content (year-grouped); new `<link>` to Google Fonts in `<head>`.
- `posts/*.html` (×16) — new `<link>` to Google Fonts in each `<head>`; insert kicker + hero image markup at the top of each `<article>`.

**Preserved as-is:**
- `assets/images/vijay.jpg` — author portrait used on About page.
- Post HTML body content inside `<div class="post-content">` — unchanged across all 16 posts.

---

## Task 1: Project setup and baseline preview

**Files:** None modified. Scripts/commands only.

- [ ] **Step 1: Verify working directory and clean tree**

Run:
```bash
cd /home/vpanangipally/workshop/awonderfullife
git status
git log -1 --oneline
```

Expected:
- `git status` shows clean tree (no unstaged changes after the spec commit).
- `git log` shows commit `Add website redesign spec` at HEAD.

If unclean: stash or commit any in-progress work before continuing.

- [ ] **Step 2: Confirm post inventory matches the map**

Run:
```bash
ls posts/*.html | wc -l
```

Expected: `16`

If the count is different: STOP and re-check the spec's post list against the actual files — the plan's post→category map must match what's on disk.

- [ ] **Step 3: Start a local preview server (background)**

Run (keep this running in a separate terminal or background it):
```bash
python3 -m http.server 8000 --bind 127.0.0.1 &
echo $! > /tmp/awl-preview.pid
sleep 1
```

Open in browser: `http://127.0.0.1:8000/` — confirm the current (pre-redesign) site loads. Visit `/about.html` and one post (e.g. `/posts/finding-stability-in-unfinished-work-a-guide-to-endurance.html`) so you have a mental baseline.

To stop later: `kill $(cat /tmp/awl-preview.pid)`.

- [ ] **Step 4: Commit any housekeeping**

If git status is clean, skip. Otherwise:
```bash
git status
# Inspect, then commit if appropriate.
```

No commit expected for this task — it's setup.

---

## Task 2: Rewrite `assets/css/style.css`

This is the foundation. Every subsequent task assumes this stylesheet exists.

**Files:**
- Modify: `assets/css/style.css` (complete replacement).

- [ ] **Step 1: Replace `assets/css/style.css` with the new stylesheet**

Overwrite the entire file with this content:

```css
/* A Wonderful Life — Editorial Redesign
   Spec: docs/superpowers/specs/2026-05-27-website-redesign-design.md */

* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --color-bg: #ffffff;
  --color-text: #111111;
  --color-text-light: #666666;
  --color-border: #e5e5e5;
  --color-accent: #0a4a9a;
  --color-bg-soft: #f9f9f9;
  --font: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --max-width: 680px;
}

html { font-size: 16px; line-height: 1.7; }

body {
  font-family: var(--font);
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.025em;
  margin-bottom: 1rem;
}
h1 { font-size: 2.25rem; }
h2 { font-size: 1.5rem; margin-top: 2rem; }
h3 { font-size: 1.25rem; margin-top: 1.5rem; }

p { margin-bottom: 1.5rem; }

a { color: var(--color-accent); text-decoration: none; }
a:hover { text-decoration: underline; }

strong { font-weight: 600; }

/* Layout */
.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* Header */
header {
  padding: 3rem 0 2rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 3rem;
}
.site-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  margin-bottom: 0.25rem;
}
.site-title a { color: var(--color-text); }
.site-title a:hover { text-decoration: none; }
.site-tagline {
  color: var(--color-text-light);
  font-size: 0.9rem;
  font-weight: 400;
  margin-bottom: 1.5rem;
}
nav { font-size: 0.85rem; font-weight: 500; }
nav a {
  color: var(--color-text-light);
  margin-right: 1.5rem;
  letter-spacing: 0.02em;
}
nav a:hover { color: var(--color-text); text-decoration: none; }

/* Shared kicker (category label) */
.kicker {
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
  display: block;
}

/* Homepage post list (thumbnail + text) */
.post-list { list-style: none; }
.post-item {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--color-border);
}
.post-item:last-child { border-bottom: none; }
.post-thumb {
  flex-shrink: 0;
  width: 120px;
  height: 90px;
  object-fit: cover;
  border-radius: 2px;
  display: block;
}
.post-item .post-body { flex: 1; min-width: 0; }
.post-title {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin-bottom: 0.4rem;
  margin-top: 0;
}
.post-title a { color: var(--color-text); }
.post-title a:hover { color: var(--color-accent); text-decoration: none; }
.post-excerpt {
  color: var(--color-text-light);
  font-size: 0.95rem;
  line-height: 1.55;
  margin-bottom: 0.4rem;
}
.post-date {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: var(--color-text-light);
  text-transform: uppercase;
}

/* Single post page */
.post-header { margin-bottom: 1.5rem; }
.post-header h1 {
  font-size: 2.25rem;
  line-height: 1.15;
  letter-spacing: -0.025em;
  margin-bottom: 0.5rem;
}
.post-header .post-byline {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-light);
  margin-bottom: 0;
}
.post-hero {
  width: 100%;
  height: auto;
  aspect-ratio: 16/9;
  object-fit: cover;
  margin: 1rem 0 0.5rem;
  border-radius: 2px;
}
.post-hero-caption {
  font-size: 0.85rem;
  color: var(--color-text-light);
  font-style: italic;
  margin: 0 0 2rem;
}
.post-content {
  font-size: 1.05rem;
  line-height: 1.8;
}
.post-content h2, .post-content h3 { font-weight: 700; }
.post-content img { max-width: 100%; height: auto; margin: 2rem 0; }
.post-content blockquote {
  border-left: 3px solid var(--color-accent);
  padding-left: 1.5rem;
  margin: 2rem 0;
  font-style: italic;
  color: var(--color-text-light);
}
.post-content ul, .post-content ol {
  margin-left: 1.5rem;
  margin-bottom: 1.5rem;
}
.post-content li { margin-bottom: 0.5rem; }
.post-content code {
  background: var(--color-bg-soft);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Courier New', monospace;
}
.post-content pre {
  background: var(--color-bg-soft);
  padding: 1rem;
  border-radius: 3px;
  overflow-x: auto;
  margin: 1.5rem 0;
}
.post-content pre code { background: none; padding: 0; }

/* About */
.about-header { text-align: center; margin-bottom: 3rem; }
.about-photo {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1.5rem;
}
.about-header h1 {
  font-size: 2rem;
}
.about-content { font-size: 1.05rem; line-height: 1.75; }

/* Archive */
.archive-year {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-top: 2.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}
.archive-year:first-of-type { margin-top: 0; }
.archive-list { list-style: none; margin-top: 0.75rem; }
.archive-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding: 0.45rem 0;
}
.archive-item .archive-title { font-size: 1rem; font-weight: 500; }
.archive-item .archive-title a { color: var(--color-text); }
.archive-item .archive-title a:hover { color: var(--color-accent); text-decoration: none; }
.archive-item .archive-date {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: var(--color-text-light);
  text-transform: uppercase;
  flex-shrink: 0;
}

/* Newsletter */
.newsletter {
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 2rem;
  margin: 3rem 0;
  text-align: center;
}
.newsletter h3 { font-size: 1.25rem; margin-bottom: 0.5rem; font-weight: 600; }
.newsletter p {
  color: var(--color-text-light);
  margin-bottom: 1rem;
  font-size: 0.95rem;
}
.newsletter-form {
  display: flex;
  gap: 0.5rem;
  max-width: 400px;
  margin: 0 auto;
}
.newsletter-form input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-family: var(--font);
  font-size: 0.95rem;
}
.newsletter-form button {
  padding: 0.75rem 1.5rem;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 4px;
  font-family: var(--font);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  white-space: nowrap;
}
.newsletter-form button:hover { background: #08366e; }

/* Footer */
footer {
  margin-top: 4rem;
  padding: 2rem 0;
  border-top: 1px solid var(--color-border);
  font-size: 0.85rem;
  color: var(--color-text-light);
  text-align: center;
}

/* Focus styles (accessibility) */
a:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 640px) {
  html { font-size: 15px; }
  header { padding: 2rem 0 1.5rem; }
  .site-title { font-size: 1.25rem; }
  nav a { margin-right: 1rem; }
  .post-item {
    gap: 1rem;
    padding: 1.25rem 0;
  }
  .post-thumb { width: 90px; height: 68px; }
  .post-title { font-size: 1.15rem; }
  .post-header h1 { font-size: 1.75rem; }
  .newsletter { padding: 1.5rem; }
  .newsletter-form { flex-direction: column; }
  .newsletter-form button { width: 100%; }
  .archive-item { flex-direction: column; gap: 0.2rem; align-items: flex-start; }
}
```

- [ ] **Step 2: Verify the stylesheet contains every expected token**

Run:
```bash
for tok in "--color-bg" "--color-text" "--color-accent" "--color-bg-soft" ".kicker" ".post-thumb" ".post-hero" ".archive-year" ".archive-item"; do
  grep -q "$tok" assets/css/style.css && echo "OK $tok" || echo "MISSING $tok"
done
```

Expected output: every line begins with `OK`. If any `MISSING` appears: re-check the file content from Step 1.

- [ ] **Step 3: Visual preview**

With `python3 -m http.server 8000` still running from Task 1, refresh `http://127.0.0.1:8000/` in your browser.

Expected: the homepage will look broken (no Manrope font loaded yet, list still in old markup), but text should be readable, fonts fall back to system sans, colors switched from blue `#0066cc` to deep blue `#0a4a9a`.

This is intentional — fonts and markup arrive in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add assets/css/style.css
git commit -m "Replace stylesheet with editorial redesign

Introduces Manrope-ready typography, crisp white + editorial blue
palette, thumbnail-aware post-list layout, post hero & caption
styles, year-grouped archive styles, and refined responsive rules.
HTML still references the old class names — those are updated in
following commits."
```

---

## Task 3: Rewrite `index.html` (homepage)

**Files:**
- Modify: `index.html` (full replacement).

- [ ] **Step 1: Replace `index.html` with the new homepage**

Overwrite the entire file with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>A Wonderful Life - Data, life, and the space between</title>
    <meta name="description" content="A blog by Vijay Panangipally exploring technology, data, and the human experience.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <header>
        <div class="container">
            <h1 class="site-title"><a href="index.html">A Wonderful Life</a></h1>
            <p class="site-tagline">Data, life, and the space between</p>
            <nav>
                <a href="index.html">Home</a>
                <a href="about.html">About</a>
                <a href="archive.html">Archive</a>
            </nav>
        </div>
    </header>

    <main class="container">
        <ul class="post-list">
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/finding-stability-in-unfinished-work-a-guide-to-endurance.jpg" alt="Finding Stability in Unfinished Work">
                <div class="post-body">
                    <span class="kicker">Reflection</span>
                    <h2 class="post-title"><a href="posts/finding-stability-in-unfinished-work-a-guide-to-endurance.html">Finding Stability in Unfinished Work: A Guide to Endurance</a></h2>
                    <p class="post-excerpt">The author reflects on the concept of "working through it," which signifies ongoing personal growth amidst uncertainty. Through patience and resilience, they have learned that stability lies not in finishing tasks, but in maintaining the strength to keep progressing while confronting the unfinished.</p>
                    <p class="post-date">February 18, 2026</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/data-dilemma-starving-for-truth-in-a-sea-of-misinformation.jpg" alt="Data Dilemma: Starving for Truth">
                <div class="post-body">
                    <span class="kicker">Society</span>
                    <h2 class="post-title"><a href="posts/data-dilemma-starving-for-truth-in-a-sea-of-misinformation.html">Data Dilemma: Starving for Truth in a Sea of Misinformation</a></h2>
                    <p class="post-excerpt">The author reflects on the disconnect between economic data and lived reality, highlighting how numbers can be manipulated to serve narratives. They advocate for active engagement, critical analysis, and diversified information sources — the fight for truth begins with awareness and informed conversation.</p>
                    <p class="post-date">March 04, 2025</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/siris-major-ai-overhaul-features-of-ios-18-5-you-need-to-know.jpg" alt="Siri's Major AI Overhaul">
                <div class="post-body">
                    <span class="kicker">Technology</span>
                    <h2 class="post-title"><a href="posts/siris-major-ai-overhaul-features-of-ios-18-5-you-need-to-know.html">Siri's Major AI Overhaul: Features of iOS 18.5 You Need to Know</a></h2>
                    <p class="post-excerpt">Apple is set to upgrade Siri significantly with the introduction of Apple Intelligence. Key improvements include better contextual understanding, more natural conversations, tighter integration with Apple apps, and personalized suggestions — finally positioning Siri as a competitive AI assistant.</p>
                    <p class="post-date">March 03, 2025</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/the-united-states-and-canada-uneasy-neighbors-shared-failures.jpg" alt="Confronting Inequality: The American and Canadian Experience">
                <div class="post-body">
                    <span class="kicker">Politics</span>
                    <h2 class="post-title"><a href="posts/the-united-states-and-canada-uneasy-neighbors-shared-failures.html">Confronting Inequality: The American and Canadian Experience</a></h2>
                    <p class="post-excerpt">The histories of the United States and Canada reveal ambitions of prosperity shadowed by deep-rooted inequalities, systemic injustices, and legacies of colonialism. Both nations must acknowledge their failings and engage in rectifying injustices for a fairer future.</p>
                    <p class="post-date">November 18, 2024</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/india-and-pakistan-twin-dreams-divided-bound-by-hope.jpg" alt="India and Pakistan: Twin Dreams Divided">
                <div class="post-body">
                    <span class="kicker">Society</span>
                    <h2 class="post-title"><a href="posts/india-and-pakistan-twin-dreams-divided-bound-by-hope.html">India and Pakistan: Twin Dreams Divided, Bound by Hope</a></h2>
                    <p class="post-excerpt">In August 1947, the British Empire partitioned South Asia into India and Pakistan, resulting in the displacement of 15 million people. Seventy-six years later, both nations grapple with founding dreams and present realities — and the future demands cooperation and reform.</p>
                    <p class="post-date">November 18, 2024</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/fostering-unity-in-canada-combating-divisive-rhetoric.jpg" alt="Fostering Unity in Canada">
                <div class="post-body">
                    <span class="kicker">Politics</span>
                    <h2 class="post-title"><a href="posts/fostering-unity-in-canada-combating-divisive-rhetoric.html">Fostering Unity in Canada: Combating Divisive Rhetoric</a></h2>
                    <p class="post-excerpt">A reflection on the divisive rhetoric increasingly shaping Canadian discourse, and a call to recommit to the values of unity, plurality, and shared responsibility that built the country in the first place.</p>
                    <p class="post-date">November 07, 2024</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/2024-election-results-a-call-for-change.jpg" alt="2024 Election Results: A Call for Change">
                <div class="post-body">
                    <span class="kicker">Politics</span>
                    <h2 class="post-title"><a href="posts/2024-election-results-a-call-for-change.html">2024 Election Results: A Call for Change</a></h2>
                    <p class="post-excerpt">An analysis of the 2024 U.S. election outcome and what it signals about the appetite for change — across the political map, the economy, and the social contract that defines a country in flux.</p>
                    <p class="post-date">November 06, 2024</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/apple-intelligence-ai-for-us-everyday-users.jpg" alt="Apple Intelligence: AI for Everyday Users">
                <div class="post-body">
                    <span class="kicker">Technology</span>
                    <h2 class="post-title"><a href="posts/apple-intelligence-ai-for-us-everyday-users.html">Apple Intelligence: AI for Us Everyday Users</a></h2>
                    <p class="post-excerpt">How Apple's privacy-first approach to on-device AI changes what everyday users can expect — from smarter notifications to richer writing tools — without the data-extraction trade-offs of competing platforms.</p>
                    <p class="post-date">October 29, 2024</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/dream-big-transforming-education-for-every-child.jpg" alt="Dream Big: Transforming Education for Every Child">
                <div class="post-body">
                    <span class="kicker">Society</span>
                    <h2 class="post-title"><a href="posts/dream-big-transforming-education-for-every-child.html">Dream Big: Transforming Education for Every Child</a></h2>
                    <p class="post-excerpt">A case for treating education as the highest-leverage investment any society can make — and a look at what's quietly working in classrooms most policy debates ignore.</p>
                    <p class="post-date">October 09, 2024</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/how-integrity-and-empathy-define-us.jpg" alt="How Integrity and Empathy Define Us">
                <div class="post-body">
                    <span class="kicker">Reflection</span>
                    <h2 class="post-title"><a href="posts/how-integrity-and-empathy-define-us.html">How Integrity and Empathy Define Us</a></h2>
                    <p class="post-excerpt">On the quiet decisions that build character — and why the smallest acts of empathy compound into the kind of integrity that holds when everything else gives way.</p>
                    <p class="post-date">October 09, 2024</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/ratan-tata-the-giant-who-wore-his-greatness-lightly.jpg" alt="Ratan Tata: The Giant Who Wore His Greatness Lightly">
                <div class="post-body">
                    <span class="kicker">Reflection</span>
                    <h2 class="post-title"><a href="posts/ratan-tata-the-giant-who-wore-his-greatness-lightly.html">Ratan Tata: The Giant Who Wore His Greatness Lightly</a></h2>
                    <p class="post-excerpt">A tribute to Ratan Tata — a leader whose scale was matched by his restraint. What his life teaches about ambition that isn't loud, and impact that doesn't announce itself.</p>
                    <p class="post-date">October 09, 2024</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/leadership-contrasts-in-u-s-election-a-canadians-view-on-global-impact.jpg" alt="Leadership Contrasts in U.S. Election">
                <div class="post-body">
                    <span class="kicker">Politics</span>
                    <h2 class="post-title"><a href="posts/leadership-contrasts-in-u-s-election-a-canadians-view-on-global-impact.html">Leadership Contrasts in U.S. Election: A Canadian's View on Global Impact</a></h2>
                    <p class="post-excerpt">From north of the border, the 2024 American election looked less like a domestic contest and more like a referendum on the global order. What a Canadian sees that an American can't.</p>
                    <p class="post-date">September 11, 2024</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/trump-vs-harris-policy-strategy-and-leadership-in-u-s-presidential-debate.jpg" alt="Trump vs. Harris: Policy, Strategy, and Leadership">
                <div class="post-body">
                    <span class="kicker">Politics</span>
                    <h2 class="post-title"><a href="posts/trump-vs-harris-policy-strategy-and-leadership-in-u-s-presidential-debate.html">Trump vs. Harris: Policy, Strategy, and Leadership in U.S. Presidential Debate</a></h2>
                    <p class="post-excerpt">Beyond the soundbites — a close read of what each candidate actually proposed, where their strategies diverged, and what their debate performances reveal about how each would lead.</p>
                    <p class="post-date">September 11, 2024</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/whispers-of-wanderlust-an-eco-friendly-journey-across-canada.jpg" alt="Whispers of Wanderlust: An Eco-Friendly Journey Across Canada">
                <div class="post-body">
                    <span class="kicker">Travel</span>
                    <h2 class="post-title"><a href="posts/whispers-of-wanderlust-an-eco-friendly-journey-across-canada.html">Whispers of Wanderlust: An Eco-Friendly Journey Across Canada</a></h2>
                    <p class="post-excerpt">Notes from a slow, low-impact crossing of Canada — the small choices that add up, the places that reward patience, and what travel asks of us when the planet is the destination too.</p>
                    <p class="post-date">March 15, 2024</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/an-ode-to-winter-discovering-unforeseen-charms-in-torontos-embrace.jpg" alt="An Ode to Winter: Discovering Charms in Toronto's Embrace">
                <div class="post-body">
                    <span class="kicker">Travel</span>
                    <h2 class="post-title"><a href="posts/an-ode-to-winter-discovering-unforeseen-charms-in-torontos-embrace.html">An Ode to Winter: Discovering Unforeseen Charms in Toronto's Embrace</a></h2>
                    <p class="post-excerpt">A love letter to a season most people endure rather than enjoy — and to a city that, once you stop fighting the cold, hands back something quiet, generous, and unmistakably its own.</p>
                    <p class="post-date">March 14, 2024</p>
                </div>
            </li>
            <li class="post-item">
                <img class="post-thumb" src="assets/images/posts/wanderlust-diaries-journeys-beyond-borders.jpg" alt="Wanderlust Diaries: Journeys Beyond Borders">
                <div class="post-body">
                    <span class="kicker">Travel</span>
                    <h2 class="post-title"><a href="posts/wanderlust-diaries-journeys-beyond-borders.html">Wanderlust Diaries: Journeys Beyond Borders</a></h2>
                    <p class="post-excerpt">An opening entry from a longer travel journal — what borders mean when you've crossed enough of them, and the kinds of stories that only show up after the photographs stop.</p>
                    <p class="post-date">March 14, 2024</p>
                </div>
            </li>
        </ul>

        <div class="newsletter">
            <h3>Stay Connected</h3>
            <p>Get new posts delivered to your inbox</p>
            <form class="newsletter-form" action="https://buttondown.email/api/emails/embed-subscribe/awonderfullife" method="post" target="_blank">
                <input type="email" name="email" placeholder="your@email.com" required>
                <button type="submit">Subscribe</button>
            </form>
        </div>
    </main>

    <footer>
        <div class="container">
            <p>&copy; 2026 Vijay Panangipally. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>
```

- [ ] **Step 2: Verify all 16 posts are listed with kicker + thumbnail + title + date**

Run:
```bash
grep -c '<li class="post-item">' index.html
grep -c '<span class="kicker">' index.html
grep -c '<img class="post-thumb"' index.html
```

Expected: each command outputs `16`.

If any is not 16: re-check the file content — every `<li class="post-item">` must contain exactly one `<span class="kicker">` and one `<img class="post-thumb">`.

- [ ] **Step 3: Verify category distribution matches the post→category map**

Run:
```bash
for cat in Reflection Society Politics Technology Travel; do
  count=$(grep -c "<span class=\"kicker\">$cat</span>" index.html)
  echo "$cat: $count"
done
```

Expected:
```
Reflection: 3
Society: 3
Politics: 5
Technology: 2
Travel: 3
```

If any category count is off: cross-reference against the post→category map at the top of this plan and fix the wrong row(s).

- [ ] **Step 4: Visual preview**

Refresh `http://127.0.0.1:8000/` in your browser.

Expected: 16 post rows, each with a broken-image placeholder (the actual thumbnails arrive in Tasks 7–11), Manrope-rendered titles, blue uppercase kickers above each title, dates in uppercase tracked small caps below excerpts.

Visual checklist:
- Title is bold and tight-tracked.
- Excerpts read in Manrope (not Georgia).
- Hover on title shows accent blue.
- Newsletter card appears below the list.
- Footer shows the copyright line only.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Rewrite homepage with thumbnail list and categories

Lists all 16 posts (was 5) with the new editorial markup —
each row has a category kicker, thumbnail image, title, excerpt,
and uppercase date. Adds Google Fonts (Manrope) link. Thumbnails
reference assets/images/posts/<slug>.jpg, which arrive in
following commits — expect broken-image placeholders until then."
```

---

## Task 4: Update `about.html`

**Files:**
- Modify: `about.html` (add Google Fonts link, no other content changes).

- [ ] **Step 1: Add Google Fonts `<link>` tags to `<head>`**

Open `about.html`. Find the line:
```html
    <link rel="stylesheet" href="assets/css/style.css">
```

Replace it with these four lines (preserving the leading indentation of four spaces):
```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
```

- [ ] **Step 2: Verify**

Run:
```bash
grep -c 'fonts.googleapis.com' about.html
grep -c 'assets/css/style.css' about.html
```

Expected:
- `fonts.googleapis.com`: `2` (preconnect + stylesheet link).
- `assets/css/style.css`: `1`.

- [ ] **Step 3: Visual preview**

Refresh `http://127.0.0.1:8000/about.html`.

Expected: Manrope replaces Georgia/system sans throughout. Round portrait still centered, "Welcome! I'm Vijay" heading renders in Manrope 700 with negative tracking. Prose renders in Manrope 400 with 1.75 line-height. The page is visibly crisper than before.

- [ ] **Step 4: Commit**

```bash
git add about.html
git commit -m "Load Manrope on about page"
```

---

## Task 5: Rewrite `archive.html` to year-grouped compact list

**Files:**
- Modify: `archive.html` (full replacement).

- [ ] **Step 1: Replace `archive.html` with the new archive page**

Overwrite the entire file with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Archive - A Wonderful Life</title>
    <meta name="description" content="Full archive of posts from A Wonderful Life by Vijay Panangipally.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <header>
        <div class="container">
            <h1 class="site-title"><a href="index.html">A Wonderful Life</a></h1>
            <p class="site-tagline">Data, life, and the space between</p>
            <nav>
                <a href="index.html">Home</a>
                <a href="about.html">About</a>
                <a href="archive.html">Archive</a>
            </nav>
        </div>
    </header>

    <main class="container">
        <h1 class="archive-year">2026</h1>
        <ul class="archive-list">
            <li class="archive-item">
                <span class="archive-title"><a href="posts/finding-stability-in-unfinished-work-a-guide-to-endurance.html">Finding Stability in Unfinished Work: A Guide to Endurance</a></span>
                <span class="archive-date">February 18, 2026</span>
            </li>
        </ul>

        <h1 class="archive-year">2025</h1>
        <ul class="archive-list">
            <li class="archive-item">
                <span class="archive-title"><a href="posts/data-dilemma-starving-for-truth-in-a-sea-of-misinformation.html">Data Dilemma: Starving for Truth in a Sea of Misinformation</a></span>
                <span class="archive-date">March 04, 2025</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/siris-major-ai-overhaul-features-of-ios-18-5-you-need-to-know.html">Siri's Major AI Overhaul: Features of iOS 18.5 You Need to Know</a></span>
                <span class="archive-date">March 03, 2025</span>
            </li>
        </ul>

        <h1 class="archive-year">2024</h1>
        <ul class="archive-list">
            <li class="archive-item">
                <span class="archive-title"><a href="posts/the-united-states-and-canada-uneasy-neighbors-shared-failures.html">Confronting Inequality: The American and Canadian Experience</a></span>
                <span class="archive-date">November 18, 2024</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/india-and-pakistan-twin-dreams-divided-bound-by-hope.html">India and Pakistan: Twin Dreams Divided, Bound by Hope</a></span>
                <span class="archive-date">November 18, 2024</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/fostering-unity-in-canada-combating-divisive-rhetoric.html">Fostering Unity in Canada: Combating Divisive Rhetoric</a></span>
                <span class="archive-date">November 07, 2024</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/2024-election-results-a-call-for-change.html">2024 Election Results: A Call for Change</a></span>
                <span class="archive-date">November 06, 2024</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/apple-intelligence-ai-for-us-everyday-users.html">Apple Intelligence: AI for Us Everyday Users</a></span>
                <span class="archive-date">October 29, 2024</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/dream-big-transforming-education-for-every-child.html">Dream Big: Transforming Education for Every Child</a></span>
                <span class="archive-date">October 09, 2024</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/how-integrity-and-empathy-define-us.html">How Integrity and Empathy Define Us</a></span>
                <span class="archive-date">October 09, 2024</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/ratan-tata-the-giant-who-wore-his-greatness-lightly.html">Ratan Tata: The Giant Who Wore His Greatness Lightly</a></span>
                <span class="archive-date">October 09, 2024</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/leadership-contrasts-in-u-s-election-a-canadians-view-on-global-impact.html">Leadership Contrasts in U.S. Election: A Canadian's View on Global Impact</a></span>
                <span class="archive-date">September 11, 2024</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/trump-vs-harris-policy-strategy-and-leadership-in-u-s-presidential-debate.html">Trump vs. Harris: Policy, Strategy, and Leadership in U.S. Presidential Debate</a></span>
                <span class="archive-date">September 11, 2024</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/whispers-of-wanderlust-an-eco-friendly-journey-across-canada.html">Whispers of Wanderlust: An Eco-Friendly Journey Across Canada</a></span>
                <span class="archive-date">March 15, 2024</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/an-ode-to-winter-discovering-unforeseen-charms-in-torontos-embrace.html">An Ode to Winter: Discovering Unforeseen Charms in Toronto's Embrace</a></span>
                <span class="archive-date">March 14, 2024</span>
            </li>
            <li class="archive-item">
                <span class="archive-title"><a href="posts/wanderlust-diaries-journeys-beyond-borders.html">Wanderlust Diaries: Journeys Beyond Borders</a></span>
                <span class="archive-date">March 14, 2024</span>
            </li>
        </ul>
    </main>

    <footer>
        <div class="container">
            <p>&copy; 2026 Vijay Panangipally. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>
```

- [ ] **Step 2: Verify post count and year groups**

Run:
```bash
grep -c '<li class="archive-item">' archive.html
grep -c '<h1 class="archive-year">' archive.html
```

Expected:
- `archive-item`: `16`
- `archive-year`: `3` (2026, 2025, 2024)

- [ ] **Step 3: Verify per-year counts**

Run:
```bash
python3 - <<'PY'
import re
with open('archive.html') as f:
    html = f.read()
# Split into year sections
sections = re.split(r'<h1 class="archive-year">(\d{4})</h1>', html)
# sections[0] is preamble, then [year, content, year, content, ...]
for i in range(1, len(sections), 2):
    year = sections[i]
    body = sections[i+1] if i+1 < len(sections) else ''
    count = body.count('<li class="archive-item">')
    print(f"{year}: {count}")
PY
```

Expected:
```
2026: 1
2025: 2
2024: 13
```

If counts are off: re-check the post→category map at the top of this plan and fix.

- [ ] **Step 4: Visual preview**

Refresh `http://127.0.0.1:8000/archive.html`.

Expected: three year headings (2026, 2025, 2024) with a rule under each, compact title-date rows below, no thumbnails or excerpts. Manrope throughout. Hovering a title turns it editorial blue.

- [ ] **Step 5: Commit**

```bash
git add archive.html
git commit -m "Rewrite archive as year-grouped compact list

Three year sections (2026, 2025, 2024). Each entry is title + date
on one row, no thumbnails or excerpts — optimized for scanning."
```

---

## Task 6: Add kicker + hero image markup to all 16 posts

This task is mechanical and repetitive. The pattern is the same across all posts. Apply the same three edits to every file in `posts/*.html`:

1. Add Google Fonts `<link>` tags to `<head>`.
2. Replace the existing `<header class="post-header">` block.
3. Add an `<img class="post-hero">` immediately after the post header.

**Files:**
- Modify: All 16 files in `posts/*.html`.

- [ ] **Step 1: Confirm the head and header markup pattern is identical across posts**

Run:
```bash
grep -l '<link rel="stylesheet" href="../assets/css/style.css">' posts/*.html | wc -l
grep -l '<header class="post-header">' posts/*.html | wc -l
```

Expected: both output `16`. If either is different: STOP and inspect the outlier post — the per-file editing pattern below assumes uniform structure.

- [ ] **Step 2: Write a Python helper to apply the three edits**

Create file `scripts/update_posts.py` (you may delete this after the task — it's not part of the site):

```python
#!/usr/bin/env python3
"""One-shot script to add Google Fonts, replace post-header, and insert post-hero in all posts.
Idempotent: re-running on an already-updated file is a no-op."""

from pathlib import Path
import re
import sys

POSTS_DIR = Path(__file__).resolve().parent.parent / 'posts'

# Source of truth: slug -> (category, date_string)
POST_META = {
    'finding-stability-in-unfinished-work-a-guide-to-endurance': ('Reflection', 'February 18, 2026'),
    'data-dilemma-starving-for-truth-in-a-sea-of-misinformation': ('Society', 'March 04, 2025'),
    'siris-major-ai-overhaul-features-of-ios-18-5-you-need-to-know': ('Technology', 'March 03, 2025'),
    'the-united-states-and-canada-uneasy-neighbors-shared-failures': ('Politics', 'November 18, 2024'),
    'india-and-pakistan-twin-dreams-divided-bound-by-hope': ('Society', 'November 18, 2024'),
    'fostering-unity-in-canada-combating-divisive-rhetoric': ('Politics', 'November 07, 2024'),
    '2024-election-results-a-call-for-change': ('Politics', 'November 06, 2024'),
    'apple-intelligence-ai-for-us-everyday-users': ('Technology', 'October 29, 2024'),
    'dream-big-transforming-education-for-every-child': ('Society', 'October 09, 2024'),
    'how-integrity-and-empathy-define-us': ('Reflection', 'October 09, 2024'),
    'ratan-tata-the-giant-who-wore-his-greatness-lightly': ('Reflection', 'October 09, 2024'),
    'leadership-contrasts-in-u-s-election-a-canadians-view-on-global-impact': ('Politics', 'September 11, 2024'),
    'trump-vs-harris-policy-strategy-and-leadership-in-u-s-presidential-debate': ('Politics', 'September 11, 2024'),
    'whispers-of-wanderlust-an-eco-friendly-journey-across-canada': ('Travel', 'March 15, 2024'),
    'an-ode-to-winter-discovering-unforeseen-charms-in-torontos-embrace': ('Travel', 'March 14, 2024'),
    'wanderlust-diaries-journeys-beyond-borders': ('Travel', 'March 14, 2024'),
}

OLD_STYLESHEET_LINK = '    <link rel="stylesheet" href="../assets/css/style.css">'
NEW_HEAD_LINKS = (
    '    <link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
    '    <link rel="stylesheet" href="../assets/css/style.css">'
)

# Match the existing header block (date + h1) and capture the h1 text.
HEADER_RE = re.compile(
    r'<header class="post-header">\s*<p class="post-date">[^<]+</p>\s*<h1>([^<]+)</h1>\s*</header>',
    re.DOTALL,
)

def update_one(path: Path) -> str:
    slug = path.stem
    if slug not in POST_META:
        return f'SKIP (unknown slug): {slug}'
    category, date_str = POST_META[slug]

    src = path.read_text(encoding='utf-8')
    changed = False

    # 1. Insert Google Fonts links if not present
    if 'fonts.googleapis.com' not in src:
        if OLD_STYLESHEET_LINK not in src:
            return f'FAIL (no stylesheet link found): {slug}'
        src = src.replace(OLD_STYLESHEET_LINK, NEW_HEAD_LINKS, 1)
        changed = True

    # 2. Replace the post-header with the new kicker + title + byline pattern,
    #    and insert a post-hero <img> right after the header.
    m = HEADER_RE.search(src)
    if m:
        title = m.group(1).strip()
        new_block = (
            f'<header class="post-header">\n'
            f'                <span class="kicker">{category}</span>\n'
            f'                <h1>{title}</h1>\n'
            f'                <p class="post-byline">VIJAY PANANGIPALLY · {date_str.upper()}</p>\n'
            f'            </header>\n'
            f'            <img class="post-hero" src="../assets/images/posts/{slug}.jpg" alt="{title}">'
        )
        src = src[:m.start()] + new_block + src[m.end():]
        changed = True

    if changed:
        path.write_text(src, encoding='utf-8')
        return f'OK: {slug}'
    return f'NO-OP (already updated): {slug}'

def main():
    results = []
    for p in sorted(POSTS_DIR.glob('*.html')):
        results.append(update_one(p))
    for r in results:
        print(r)
    failures = [r for r in results if r.startswith(('FAIL', 'SKIP'))]
    sys.exit(1 if failures else 0)

if __name__ == '__main__':
    main()
```

- [ ] **Step 3: Run the script and verify the output**

Run:
```bash
mkdir -p scripts
# (the file above was created by the previous step)
python3 scripts/update_posts.py
```

Expected: 16 lines, each starting with `OK:`. No `FAIL` or `SKIP` lines.

If any failure: read the error, fix the script or the post, re-run. The script is idempotent — running it twice produces `NO-OP` on the second run.

- [ ] **Step 4: Grep-verify every post got the three changes**

Run:
```bash
echo "Google Fonts links present:"
grep -l 'fonts.googleapis.com' posts/*.html | wc -l
echo "Kicker spans present:"
grep -l '<span class="kicker">' posts/*.html | wc -l
echo "Hero images present:"
grep -l '<img class="post-hero"' posts/*.html | wc -l
echo "Post bylines present:"
grep -l '<p class="post-byline">' posts/*.html | wc -l
```

Expected: each count is `16`.

If any is < 16: rerun the script, or inspect the missing files manually.

- [ ] **Step 5: Spot-check one post per category**

Open in browser:
- `http://127.0.0.1:8000/posts/finding-stability-in-unfinished-work-a-guide-to-endurance.html` (Reflection)
- `http://127.0.0.1:8000/posts/apple-intelligence-ai-for-us-everyday-users.html` (Technology)
- `http://127.0.0.1:8000/posts/trump-vs-harris-policy-strategy-and-leadership-in-u-s-presidential-debate.html` (Politics)
- `http://127.0.0.1:8000/posts/wanderlust-diaries-journeys-beyond-borders.html` (Travel)

Expected for each:
- Manrope rendering.
- Blue uppercase "REFLECTION" / "TECHNOLOGY" / etc. kicker above the title.
- Title in large Manrope 700.
- Uppercase byline "VIJAY PANANGIPALLY · DATE" below the title.
- A broken-image placeholder for the hero (real image arrives in Tasks 7–11).
- The post body below renders unchanged.

- [ ] **Step 6: Remove the helper script**

The script was a one-shot for this task — it doesn't belong in the repo long-term.

Run:
```bash
rm -rf scripts
```

- [ ] **Step 7: Commit**

```bash
git add posts/
git commit -m "Add kicker, byline, and hero image markup to all 16 posts

Each post now opens with: category kicker, title, uppercase
byline, and a hero image referencing assets/images/posts/<slug>.jpg.
Google Fonts (Manrope) is loaded on every post. Body content
inside .post-content is unchanged. Hero images arrive in the
next set of commits."
```

---

## Task 7: Source hero images for Reflection (3 posts)

This task introduces the image-sourcing workflow used across Tasks 7–11. **Each post needs the user's pick before download.** The implementer's job per post: search Unsplash, propose 2–3 candidate photo URLs with rationale, wait for the user's pick, then download and commit.

**Reflection posts:**
- `finding-stability-in-unfinished-work-a-guide-to-endurance` (Feb 18, 2026)
- `how-integrity-and-empathy-define-us` (Oct 09, 2024)
- `ratan-tata-the-giant-who-wore-his-greatness-lightly` (Oct 09, 2024)

**Files (per post):**
- Create: `assets/images/posts/<slug>.jpg`

For each post in the Reflection list, repeat steps 1–4 below.

- [ ] **Step 1: Search Unsplash for the post**

In a browser, go to `https://unsplash.com/s/photos/<query>` using 2–3 search terms relevant to the post. Suggested queries per post:

| Slug | Suggested queries |
|---|---|
| `finding-stability-in-unfinished-work-a-guide-to-endurance` | `quiet workspace`, `unfinished journal`, `morning light desk` |
| `how-integrity-and-empathy-define-us` | `two hands together`, `quiet conversation`, `handshake silhouette` |
| `ratan-tata-the-giant-who-wore-his-greatness-lightly` | `mumbai skyline`, `industrial heritage`, `quiet boardroom` |

Pick 2–3 photos that feel atmospheric (not literal). Copy their Unsplash photo URLs (e.g. `https://unsplash.com/photos/xyz-abc123`).

- [ ] **Step 2: Present candidates and wait for user pick**

If working interactively with the user (recommended for personal blog imagery): paste the 2–3 candidate Unsplash URLs and a one-line rationale for each, then ask which to use.

If working as an autonomous subagent: pick the candidate whose primary subject best matches the rationale "atmospheric, not literal" — pause and ask the user via a clarifying question before downloading.

- [ ] **Step 3: Download the chosen image to `assets/images/posts/<slug>.jpg`**

Given the user's chosen Unsplash page URL (e.g. `https://unsplash.com/photos/abc-xyz123`), extract the photo ID (the trailing segment, e.g. `xyz123`) and download via the Unsplash CDN with width and quality params — no local resizing or optimization needed.

Run (substitute `<PHOTO_ID>` and `<SLUG>`):
```bash
mkdir -p assets/images/posts
curl -L --fail -o "assets/images/posts/<SLUG>.jpg" \
  "https://images.unsplash.com/<PHOTO_ID>?w=1600&q=80&fm=jpg&fit=crop&auto=format"
```

Note: the full `<PHOTO_ID>` for an Unsplash CDN URL looks like `photo-1502082553048-f009c37129b9`. You'll see this exact form when you "View raw" or "Download" a photo from Unsplash and inspect the resulting URL — copy everything between `images.unsplash.com/` and the first `?`.

- [ ] **Step 4: Verify the image**

Run:
```bash
ls -la "assets/images/posts/<SLUG>.jpg"
file "assets/images/posts/<SLUG>.jpg"
```

Expected:
- File exists and is between ~80KB and ~400KB.
- `file` output begins with `JPEG image data`.

If the file is < 10KB: the download likely failed (HTML error page) — re-check the URL and re-download.

Refresh the post page in the browser to confirm the hero renders correctly (no broken image, 16:9 crop).

- [ ] **Step 5: Commit after each post**

After each post's image is verified:
```bash
git add "assets/images/posts/<SLUG>.jpg"
git commit -m "Add hero image for <slug>"
```

(Three commits expected for Task 7, one per Reflection post.)

---

## Task 8: Source hero images for Society (3 posts)

Same workflow as Task 7. Apply steps 1–5 from Task 7 to each Society post.

**Society posts:**
- `data-dilemma-starving-for-truth-in-a-sea-of-misinformation` (Mar 04, 2025)
- `india-and-pakistan-twin-dreams-divided-bound-by-hope` (Nov 18, 2024)
- `dream-big-transforming-education-for-every-child` (Oct 09, 2024)

- [ ] **Step 1: Suggested searches**

| Slug | Suggested queries |
|---|---|
| `data-dilemma-starving-for-truth-in-a-sea-of-misinformation` | `newspaper stack`, `data visualization screen`, `crowd watching screens` |
| `india-and-pakistan-twin-dreams-divided-bound-by-hope` | `partition memorial`, `train station india`, `border landscape` |
| `dream-big-transforming-education-for-every-child` | `classroom light`, `child reading`, `school chalkboard` |

- [ ] **Step 2: For each post, complete Task 7 Steps 1–5**

Three posts, one image and one commit each.

- [ ] **Step 3: Verify**

Run:
```bash
for slug in data-dilemma-starving-for-truth-in-a-sea-of-misinformation india-and-pakistan-twin-dreams-divided-bound-by-hope dream-big-transforming-education-for-every-child; do
  [ -f "assets/images/posts/$slug.jpg" ] && echo "OK $slug" || echo "MISSING $slug"
done
```

Expected: all three lines start with `OK`.

---

## Task 9: Source hero images for Politics (5 posts)

Same workflow as Task 7.

**Politics posts:**
- `the-united-states-and-canada-uneasy-neighbors-shared-failures` (Nov 18, 2024)
- `fostering-unity-in-canada-combating-divisive-rhetoric` (Nov 07, 2024)
- `2024-election-results-a-call-for-change` (Nov 06, 2024)
- `leadership-contrasts-in-u-s-election-a-canadians-view-on-global-impact` (Sep 11, 2024)
- `trump-vs-harris-policy-strategy-and-leadership-in-u-s-presidential-debate` (Sep 11, 2024)

- [ ] **Step 1: Suggested searches**

| Slug | Suggested queries |
|---|---|
| `the-united-states-and-canada-uneasy-neighbors-shared-failures` | `border crossing`, `parliament building`, `political map` |
| `fostering-unity-in-canada-combating-divisive-rhetoric` | `canada flag windy`, `crowd silhouette`, `parliament hill` |
| `2024-election-results-a-call-for-change` | `voting booth`, `ballot box`, `polling station` |
| `leadership-contrasts-in-u-s-election-a-canadians-view-on-global-impact` | `world map politics`, `flags united states canada`, `globe office` |
| `trump-vs-harris-policy-strategy-and-leadership-in-u-s-presidential-debate` | `debate stage lights`, `podium silhouette`, `news studio` |

- [ ] **Step 2: For each post, complete Task 7 Steps 1–5**

Five posts, one image and one commit each.

- [ ] **Step 3: Verify**

Run:
```bash
for slug in \
  the-united-states-and-canada-uneasy-neighbors-shared-failures \
  fostering-unity-in-canada-combating-divisive-rhetoric \
  2024-election-results-a-call-for-change \
  leadership-contrasts-in-u-s-election-a-canadians-view-on-global-impact \
  trump-vs-harris-policy-strategy-and-leadership-in-u-s-presidential-debate; do
  [ -f "assets/images/posts/$slug.jpg" ] && echo "OK $slug" || echo "MISSING $slug"
done
```

Expected: all five lines start with `OK`.

---

## Task 10: Source hero images for Technology (2 posts)

Same workflow as Task 7.

**Technology posts:**
- `siris-major-ai-overhaul-features-of-ios-18-5-you-need-to-know` (Mar 03, 2025)
- `apple-intelligence-ai-for-us-everyday-users` (Oct 29, 2024)

- [ ] **Step 1: Suggested searches**

| Slug | Suggested queries |
|---|---|
| `siris-major-ai-overhaul-features-of-ios-18-5-you-need-to-know` | `iphone abstract`, `voice wave visualization`, `apple device macro` |
| `apple-intelligence-ai-for-us-everyday-users` | `apple device on desk`, `minimal tech still life`, `screen glow night` |

- [ ] **Step 2: For each post, complete Task 7 Steps 1–5**

Two posts, one image and one commit each.

- [ ] **Step 3: Verify**

Run:
```bash
for slug in siris-major-ai-overhaul-features-of-ios-18-5-you-need-to-know apple-intelligence-ai-for-us-everyday-users; do
  [ -f "assets/images/posts/$slug.jpg" ] && echo "OK $slug" || echo "MISSING $slug"
done
```

Expected: both lines start with `OK`.

---

## Task 11: Source hero images for Travel (3 posts)

Same workflow as Task 7.

**Travel posts:**
- `whispers-of-wanderlust-an-eco-friendly-journey-across-canada` (Mar 15, 2024)
- `an-ode-to-winter-discovering-unforeseen-charms-in-torontos-embrace` (Mar 14, 2024)
- `wanderlust-diaries-journeys-beyond-borders` (Mar 14, 2024)

- [ ] **Step 1: Suggested searches**

| Slug | Suggested queries |
|---|---|
| `whispers-of-wanderlust-an-eco-friendly-journey-across-canada` | `canadian wilderness train`, `lake louise alberta`, `quiet road forest canada` |
| `an-ode-to-winter-discovering-unforeseen-charms-in-torontos-embrace` | `toronto snow`, `winter city walk`, `cn tower fog` |
| `wanderlust-diaries-journeys-beyond-borders` | `passport map`, `airport window dawn`, `open road horizon` |

- [ ] **Step 2: For each post, complete Task 7 Steps 1–5**

Three posts, one image and one commit each.

- [ ] **Step 3: Verify all 16 hero images now exist**

Run:
```bash
ls assets/images/posts/*.jpg | wc -l
```

Expected: `16`.

Run:
```bash
for f in posts/*.html; do
  slug=$(basename "$f" .html)
  if [ -f "assets/images/posts/$slug.jpg" ]; then
    echo "OK $slug"
  else
    echo "MISSING $slug"
  fi
done
```

Expected: 16 `OK` lines, zero `MISSING`.

---

## Task 12: Final visual QA and responsive check

**Files:** None modified (unless QA reveals bugs).

- [ ] **Step 1: Refresh every page and verify desktop rendering**

With `python3 -m http.server 8000` still running, refresh in your browser:
- `http://127.0.0.1:8000/` (homepage)
- `http://127.0.0.1:8000/about.html`
- `http://127.0.0.1:8000/archive.html`
- At least one post per category (Reflection / Society / Politics / Technology / Travel).

Checklist for each page:
- Manrope renders correctly (not falling back to system sans).
- All thumbnails / heroes load (no broken-image icons).
- Title hover turns editorial blue.
- Kicker is uppercase, tracked, blue.
- Newsletter card renders correctly on index and post pages (not on archive).
- Footer shows only the copyright line.

- [ ] **Step 2: Verify mobile rendering (≤ 640px)**

In Chrome / Edge / Firefox: open DevTools (F12) → toggle device toolbar → set width to 375px (iPhone size).

Refresh each page checked in Step 1.

Checklist:
- No horizontal scrollbar.
- Homepage post-list rows shrink to 90×68 thumbs + smaller titles.
- Archive page rows wrap title above date (vertical stack).
- Newsletter input + button stack vertically.
- Hero image inside a post stays full-width without overflow.

If anything overflows: inspect the offending element, identify the rule, fix it in `assets/css/style.css`, and commit with `Fix mobile <description>`.

- [ ] **Step 3: Verify accessibility basics**

Run a basic contrast check:
```bash
# Quick check that every post hero has alt text
grep '<img class="post-hero"' posts/*.html | grep -v 'alt="' && echo "MISSING ALTS FOUND" || echo "OK all heroes have alt"
grep '<img class="post-thumb"' index.html | grep -v 'alt="' && echo "MISSING ALTS FOUND" || echo "OK all thumbs have alt"
```

Expected: both echo `OK ...`.

Tab through the homepage with the keyboard — every link should show the focus outline (2px editorial blue) clearly.

- [ ] **Step 4: Stop the preview server**

Run:
```bash
kill $(cat /tmp/awl-preview.pid) 2>/dev/null
rm -f /tmp/awl-preview.pid
```

- [ ] **Step 5: Final commit (if Step 2 or Step 3 turned up fixes)**

If you made fixes during QA:
```bash
git add assets/css/style.css
git commit -m "QA fixes: <one-line description of each fix>"
```

Otherwise, no commit needed — the redesign is complete.

- [ ] **Step 6: Confirm overall git log**

Run:
```bash
git log --oneline | head -25
```

Expected: a clean linear history starting from `Initial Load`, with one commit per task (12 tasks → ~12–17 commits depending on QA fixes).

---

## Done

The site is redesigned. Visit `index.html`, `about.html`, `archive.html`, and any post to confirm the editorial direction, Manrope typography, crisp white + blue palette, hero photography, thumbnail homepage, year-grouped archive, and five-category taxonomy are all live.

If you want to push to GitHub:
```bash
git push origin main
```
