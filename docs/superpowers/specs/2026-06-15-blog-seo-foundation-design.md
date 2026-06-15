# Blog SEO Foundation — Design Spec

**Date:** 2026-06-15
**Status:** Proposed (awaiting review)
**Repo:** awonderfullife.ca (static blog on Cloudflare Workers, auto-deploys from `main`)
**Sibling precedent:** the same foundation shipped for ezziclarity.ca on 2026-06-15 (see that repo's CHANGELOG). This spec adapts it to a single-language personal blog with per-post articles.

## Goal

Give the blog a complete technical SEO and social-sharing foundation across all 24 pages, with **no changes to copy, design, or URLs**, and without touching the `/api` worker. Today the pages have **no canonical, no Open Graph, no Twitter card, and no structured data at all** — so this is a from-scratch metadata layer, plus a sitemap and robots.txt the site has never had.

## Hard constraints

- **No new prose.** Reuse each page's existing `<title>`, `<meta name="description">`, and (for posts) `<h1>` and byline verbatim. The only authored English is one concise site description and the Person description, both drawn from existing About copy.
- **Absolute apex URLs.** Every emitted URL (canonical, og:url, JSON-LD `url`/`@id`, sitemap `<loc>`, image URLs) is absolute on `https://awonderfullife.ca/`. Internal page URLs keep the existing `.html` form the links already use (dropping `.html` is a separate, deferred ROADMAP item; canonicals must match what is actually linked and served to avoid a canonical/served mismatch).
- **Single language.** The site is English only (`<html lang="en">`). No hreflang cluster, no `og:locale:alternate`. One `og:locale` (`en_CA`) per page.
- **Idempotent.** Skip any page already containing `application/ld+json`.
- **Do not touch:** `/api/**`, post body content, the newsletter form action, `.assetsignore`, or any existing a11y attributes.

## Page inventory (24 pages)

| Group | Files | Count |
|---|---|---|
| Home | `index.html` | 1 |
| Static | `about.html`, `archive.html` | 2 |
| Categories | `categories/{politics,reflection,society,technology,travel}.html` | 5 |
| Posts | `posts/<slug>.html` | 16 |

`404.html` is included in the HTTP sweep but not the sitemap (noindex by nature). The `/api` worker is out of scope entirely.

## Work items

### 1. Absolute self-canonical (all 24 pages)

No page has a canonical today. Add `<link rel="canonical" href="<absolute page URL>">` to each:
- `index.html` -> `https://awonderfullife.ca/`
- `about.html` -> `https://awonderfullife.ca/about.html`
- `archive.html` -> `https://awonderfullife.ca/archive.html`
- `categories/<cat>.html` -> `https://awonderfullife.ca/categories/<cat>.html`
- `posts/<slug>.html` -> `https://awonderfullife.ca/posts/<slug>.html`

(Apex root canonical for the home page; `.html` form for the rest, matching the actual internal links and served paths.)

### 2. Open Graph + Twitter Card (all 24 pages)

Add a consistent block per page:
- `og:title` (reuse existing `<title>`), `og:description` (reuse `<meta name="description">`), `og:url` (the page's absolute URL), `og:site_name` ("A Wonderful Life"), `og:locale` ("en_CA").
- `og:type`: **`article`** for the 16 posts, **`website`** for the other 8.
- `og:image`: see the image strategy below. Always absolute.
- For posts only, the OG article sub-tags: `article:published_time` (ISO 8601 from the byline date), `article:author` ("Vijay Panangipally"), `article:section` (the category from the kicker).
- Twitter: `twitter:card` = `summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image` (mirror og:image).

### 3. og:image / twitter:image strategy

| Page type | Image | Why |
|---|---|---|
| Posts (16) | the post's own hero `assets/images/posts/<slug>.jpg` (1600x896) | Per-post art already exists; ideal ~1.79:1 ratio. |
| About | `assets/images/vijay.jpg` (595x592) | The author portrait is the right share image for the About page and doubles as `Person.image`. |
| Home, Archive, Categories (7) | a new `assets/images/og-default.jpg` (1600x896) | These have no natural single image. Generate ONE brand-default illustration in the established series style (flat editorial, terracotta/slate-blue/cream) via `docs/superpowers/tools/gen-hero.sh`, QC it like any hero. This is the only new asset. |

### 4. JSON-LD `@graph` (all 24 pages)

Inject `<script type="application/ld+json">` before `</head>`, serialized with non-ASCII preserved. Stable shared nodes (identical on every page) plus one per-page node.

Shared nodes:
- **WebSite** `@id https://awonderfullife.ca/#website`: name "A Wonderful Life", alternateName "Data, life, and the space between", url apex, description (concise, from existing home copy), inLanguage "en-CA", publisher -> `#person`.
- **Person** `@id https://awonderfullife.ca/#person`: name "Vijay Panangipally", url apex, image `https://awonderfullife.ca/assets/images/vijay.jpg`, description (from About copy), jobTitle "Writer". `sameAs` is intentionally omitted until real social profiles exist (no placeholders).
- **Blog** `@id https://awonderfullife.ca/#blog`: name "A Wonderful Life", url apex, inLanguage "en-CA", author -> `#person`, publisher -> `#person`, isPartOf -> `#website`.

Per-page node:
- **Posts -> `BlogPosting`** `@id <page-url>#article`: headline = the post's `<h1>` text verbatim (clean title, no " - A Wonderful Life" suffix); description = the page's meta description verbatim; image = the absolute hero URL; datePublished = ISO 8601 parsed from the byline ("OCTOBER 09, 2024" -> "2024-10-09"); dateModified = same (no better signal available); author -> `#person`; publisher -> `#person`; articleSection = the category (kicker text); inLanguage "en-CA"; mainEntityOfPage = the page URL; url = the page URL; isPartOf -> `#blog`.
- **Home -> `CollectionPage`** `@id https://awonderfullife.ca/#webpage`: name = `<title>` verbatim, description = meta description verbatim, url apex, isPartOf -> `#website`, about -> `#person`.
- **About -> `AboutPage`** `@id <url>#webpage`: name/description verbatim, about -> `#person`.
- **Archive + Categories -> `CollectionPage`** `@id <url>#webpage`: name/description verbatim, isPartOf -> `#website`. (Category pages set `about`/`isPartOf` -> `#blog`.)

### 5. sitemap.xml (new)

Create at repo root. Sitemaps 0.9 namespace (no xhtml namespace needed — single language). One `<url>` per indexable page (23: home, about, archive, 5 categories, 16 posts; 404 excluded), each with an absolute `<loc>` and a `<lastmod>`: post URLs use the post's published date, the 7 static/collection URLs use 2026-06-15.

### 6. robots.txt (new)

Create at repo root: allow all, `Sitemap: https://awonderfullife.ca/sitemap.xml`. Note: awonderfullife.ca is a Cloudflare zone; if Cloudflare's managed-robots / AI Crawl Control feature is enabled, the live file may be prepended with a managed block (as observed on ezziclarity). This is benign for search indexing; documented in ROADMAP.

## Implementation

- A single idempotent Python generator parses each file for its title / meta description / (posts) h1 / byline date / kicker category, then injects the canonical + OG/Twitter + JSON-LD block before `</head>`. It is the same triplicate-trap avoidance used on ezziclarity.
- **Decision to confirm — keep the generator as a tool.** Unlike ezziclarity's one-shot trilingual pass (deleted after running), this blog gains new posts over time, each of which will need the same SEO block. Recommendation: keep the generator at `docs/superpowers/tools/seo-inject.py` (the `docs/` tree is already excluded from the public asset bundle, so it never deploys) so a new post is covered by a re-run. The alternative is to delete it and document the manual block in CLAUDE.md. Recommended: **keep it.**
- The one new image (`og-default.jpg`) is generated with `gen-hero.sh`, visually QC'd, and committed.

## Verification (before commit)

- All 24 pages contain valid, parseable JSON-LD; the 16 posts validate as `BlogPosting` with a valid ISO `datePublished`, an `author`, and an absolute `image`.
- Zero relative canonical / og:url / image URLs (every one starts with `https://`).
- `sitemap.xml` is well-formed XML with 23 absolute `<loc>`s; `robots.txt` present with the Sitemap line.
- No change to any post body, the newsletter action, or `/api`.
- Local `python3 -m http.server` sweep: HTTP 200 on all 24 pages plus `/sitemap.xml`, `/robots.txt`, `/404.html`.
- Idempotent re-run is a byte-identical no-op.
- Independent subagent validation passes (structured-data + canonical/OG correctness; sitemap/robots/scope/idempotency), matching the ezziclarity process.

## Docs

- `CHANGELOG.md`: dated 2026-06-15 entry describing the foundation and verification results.
- `ROADMAP.md`: add a deferred-SEO section — `sameAs` once real socials exist, `BreadcrumbList` schema, the Cloudflare managed-robots note, and the off-site actions (Search Console + Bing verification and sitemap submission). Note the `.html`-suffix item now also implies a future canonical update.
- `CLAUDE.md`: note the new in-`<head>` SEO block, and extend the "four-plus-places rule" so a new post also gets its SEO block (via the kept `seo-inject.py` re-run) and a sitemap entry.

## Out of scope (deferred)

- Dropping `.html` from internal links (and the matching canonical change).
- `BreadcrumbList` and richer per-section schema.
- `sameAs` social links (none exist yet).
- Off-site: Search Console / Bing verification + sitemap submission (manual, off-repo).
- Anything in `/api`.

## Workflow

Branch `seo/blog-foundation` -> PR -> merge under the `vijaybpanangi` identity (this repo's standing identity) -> confirm Cloudflare deploy -> live verify.
