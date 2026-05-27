# A Wonderful Life — Website Redesign

**Date:** 2026-05-27
**Author:** Vijay Panangipally (with Claude)
**Scope:** Visual and structural redesign of the static blog at `awonderfullife/`. No new pages, no build system change, no CMS migration.

## Goals

Modernize the visual style of the site. The current look is functional but feels dated and generic. The redesign sharpens visual hierarchy, introduces imagery to every post, upgrades typography for crispness, and adds a lightweight category system. Content (post HTML bodies, about copy, archive entries) is preserved verbatim — only the surrounding presentation changes.

## Non-Goals

- No build pipeline / static site generator. Files remain hand-edited HTML.
- No CMS, no JavaScript framework, no client-side routing.
- No backend changes — newsletter still uses the existing Buttondown form action.
- No content rewriting. Post bodies, about copy, and post titles stay as-is.
- No new pages beyond the three that exist (index, about, archive).
- No dark mode toggle in this pass.

## Design Decisions (Locked)

### Visual direction
**Editorial** — magazine-inspired hierarchy. Each post-listing card and each post hero uses: small uppercase category kicker → strong title → short rule → excerpt/byline → date.

### Typography
**Manrope** (Google Fonts) for the entire site — headlines, body, UI, meta.
- Weights loaded: 400, 500, 600, 700.
- Headlines: weight 700, tracking `-0.025em`, line-height 1.1.
- Body: weight 400, line-height 1.7.
- Kickers / small uppercase labels: weight 500, tracking `2px`, uppercase.
- All fallbacks to system sans-serif.
- Loaded via `<link>` to `fonts.googleapis.com` with `display=swap`.

Manrope was chosen as a free, GE-Inspira-adjacent humanist sans (geometric warmth + modernist clarity).

### Color palette
| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#ffffff` | Page background |
| `--color-text` | `#111111` | Body text, titles |
| `--color-text-light` | `#666666` | Secondary text, dates, captions |
| `--color-border` | `#e5e5e5` | Rules, dividers |
| `--color-accent` | `#0a4a9a` | Links, kickers, short editorial rules |
| `--color-bg-soft` | `#f9f9f9` | Newsletter card background |

### Imagery
**Editorial photography.** One hero image per post.
- Source: curated Unsplash images (atmospheric, not literal). Permitted by Unsplash license.
- Storage: downloaded locally to `assets/images/posts/<post-slug>.jpg` — no hotlinking. Images committed to the repo.
- Image processing: long edge resized to 1600px max, JPEG quality ~80, target file size ≤ 200KB.
- Size: render at full content width (max 680px container width). Aspect ratio approximately 16:9.
- Captions: optional. When present, render in `Manrope 400, 0.85rem, --color-text-light, italic` directly below the image.
- All 17 existing posts get a hero image as part of this redesign.
- Homepage thumbnails reuse the same image, scaled to 80×60 with `object-fit: cover`.
- Selection process: during implementation, the implementer proposes 2-3 candidate Unsplash images per post (based on post title and theme); user picks one before the post gets committed. Vijay's existing `assets/images/vijay.jpg` portrait is preserved unchanged for the About page.

### Layout — Homepage (`index.html`)
- Header: site title (Manrope 700, tracked tight), tagline (Manrope 400, smaller, `--color-text-light`), nav (Home / About / Archive).
- Post list: each entry is a flex row — 80×60 thumbnail on the left, text block on the right.
  - Text block: kicker (category) · title (Manrope 700, ~1.5rem) · excerpt (existing copy) · date.
  - Rows separated by a 1px `--color-border` divider.
- Newsletter card retained, repositioned after the list.
- Latest posts first, no pagination (17 posts fit comfortably).

### Layout — Post page (each file in `posts/`)
- Same header and nav as homepage.
- Post header block: kicker (category) → title → byline (`VIJAY PANANGIPALLY · <DATE>` in uppercase, tracked).
- Hero image full content width, immediately after byline. Optional caption below.
- Body content unchanged — gets the new fonts, colors, and rules automatically via the stylesheet.
- Newsletter card at the bottom, then footer.

### Layout — About page (`about.html`)
- "Refined classic" treatment — same shape as today, sharper execution.
- Centered round 150px portrait at top.
- Headline below: "Welcome — I'm Vijay" (Manrope 700).
- Prose below, left-aligned, max 680px column, line-height 1.7.
- Newsletter card at the bottom, then footer.
- No "Currently…" block, no role tags.

### Layout — Archive page (`archive.html`)
- Compact list grouped by year — newest year first.
- Each year heading: Manrope 600, ~1.5rem, with a 1px rule below.
- Each entry under a year: title link + date, one line per post, sorted newest-first within the year.
- No thumbnails, no excerpts, no kickers (intentionally bare for scannability).

### Navigation
Unchanged: Home · About · Archive. Same three links in the same order.

### Footer
Unchanged: copyright line only. No social, no RSS, no newsletter duplicate.

### Category system (new)
Five categories, exactly one per post. Categories are stored inline in each HTML file (as part of the kicker markup), not in a separate data file.

| Category | Assigned posts |
|---|---|
| **Reflection** | `finding-stability-in-unfinished-work-a-guide-to-endurance`, `how-integrity-and-empathy-define-us`, `ratan-tata-the-giant-who-wore-his-greatness-lightly` |
| **Society** | `data-dilemma-starving-for-truth-in-a-sea-of-misinformation`, `dream-big-transforming-education-for-every-child`, `india-and-pakistan-twin-dreams-divided-bound-by-hope` |
| **Politics** | `2024-election-results-a-call-for-change`, `fostering-unity-in-canada-combating-divisive-rhetoric`, `leadership-contrasts-in-u-s-election-a-canadians-view-on-global-impact`, `the-united-states-and-canada-uneasy-neighbors-shared-failures`, `trump-vs-harris-policy-strategy-and-leadership-in-u-s-presidential-debate` |
| **Technology** | `apple-intelligence-ai-for-us-everyday-users`, `siris-major-ai-overhaul-features-of-ios-18-5-you-need-to-know` |
| **Travel** | `an-ode-to-winter-discovering-unforeseen-charms-in-torontos-embrace`, `wanderlust-diaries-journeys-beyond-borders`, `whispers-of-wanderlust-an-eco-friendly-journey-across-canada` |

Categories render as the kicker on:
- Homepage post-list rows.
- Post page header above title.

Categories do NOT render on the Archive page (kept bare per layout decision above).

## File-Level Changes

| File | Change |
|---|---|
| `assets/css/style.css` | Replace with new stylesheet implementing the design (CSS custom properties, Manrope, editorial hierarchy, thumbnail list, hero post layout, archive grouping). |
| `assets/images/posts/` | New directory; one `.jpg` per post (17 files), named to match the post slug. |
| `index.html` | Rewrite the `<ul class="post-list">` markup to the thumbnail + text-block flex layout. Add `<link>` to Google Fonts in `<head>`. Add category kicker per row. |
| `about.html` | Add `<link>` to Google Fonts. Minor markup adjustments to align with new styles (e.g., dropped underlines on `<strong>` if any). Content unchanged. |
| `archive.html` | Rewrite markup to year-grouped compact list. Add `<link>` to Google Fonts. |
| `posts/*.html` (×17) | Add `<link>` to Google Fonts in each `<head>`. Insert kicker (category) and hero image markup at the top of the post body. Body prose unchanged. |
| `.gitignore` | Add `.superpowers/` (the brainstorming session directory) if not already ignored. |

## Responsive Behavior

- Existing `@media (max-width: 640px)` breakpoint retained and updated:
  - Thumbnail on homepage shrinks proportionally; row stays horizontal.
  - Hero image inside post scales to full container width.
  - Headline font size scales down (~1.25rem on mobile).
- No new breakpoints introduced.

## Accessibility

- Color contrast: `#111` on `#fff` is ~19:1 (passes AAA). `#666` on `#fff` is ~5.7:1 (passes AA for body text). Accent `#0a4a9a` on `#fff` is ~7.7:1 (passes AAA for link text).
- All hero images require descriptive `alt` text per post.
- Thumbnail images use the same `alt` as their post hero.
- Category kicker is a normal element (not a link in v1) — no extra ARIA needed.
- Focus styles: visible 2px outline on links and form controls.

## Out of Scope (Future)

- Per-category index pages (`/categories/society.html`, etc.).
- Tag system beyond categories.
- Dark mode.
- Search.
- Reading time estimates.
- Author bio block below each post.
- RSS feed.

## Open Questions

None at spec time — all decisions confirmed in brainstorming.

## Success Criteria

- All 17 existing posts render with a category kicker and a hero image without manual touch-up.
- Homepage `index.html` shows the new thumbnail list, latest-first.
- About page renders with Manrope and the round portrait, no layout regressions.
- Archive page renders year-grouped, scannable, no thumbnails.
- All pages pass the `@media (max-width: 640px)` responsive check without horizontal scroll.
- Google Fonts request returns ≤ 1 stylesheet and uses `display=swap` so text is visible during font load.
