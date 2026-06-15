# Roadmap

Future updates and deferred items for awonderfullife.ca. Items here have no fixed timeline — they're surfaced so any future session (Vijay's, mine, or another Claude's) sees the gaps and can pick them up at the right moment. Once an item ships, it moves to [`CHANGELOG.md`](CHANGELOG.md).

---

## Deferred SEO (post technical-foundation, 2026-06-15)

The technical SEO foundation shipped on 2026-06-15 (see `CHANGELOG.md`): absolute canonicals, Open Graph + Twitter cards, JSON-LD (`WebSite` / `Person` / `Blog` / per-post `BlogPosting`), a brand-default OG image, `sitemap.xml`, and `robots.txt`. Left for later:

- **`sameAs` on the `Person` node.** Omitted deliberately because there are no real social or author profiles to point at yet (no placeholders). Add LinkedIn / X / Mastodon / Substack etc. once they exist.
- **`BreadcrumbList` schema.** Posts and category pages could carry a breadcrumb (Home > Category > Post) for richer results. Low effort, deferred.
- **Cloudflare managed `robots.txt`.** awonderfullife.ca is a Cloudflare zone; if AI Crawl Control / managed robots is enabled, the live `robots.txt` may be prepended with a managed block ahead of the committed file (as observed on ezziclarity). Our `Allow: /` and the `Sitemap:` line still serve, so search indexing is unaffected. To serve exactly the repo file, toggle the managed feature off in the dashboard.
- **`.html`-suffix canonicals.** When the deferred "drop `.html` from internal links" item lands, the canonicals and sitemap `<loc>`s must move to the suffixless form in the same change so they keep matching what is served.
- **Off-site, manual (needs Vijay):** verify the domain in **Google Search Console** and **Bing Webmaster Tools**, then submit `https://awonderfullife.ca/sitemap.xml` in both.

---

## Platform API (`api.awonderfullife.ca`) — fast-follows

The Phase-1 API spine shipped 2026-06-13 (see `CHANGELOG.md` and `docs/superpowers/specs/2026-06-13-api-spine-foundation-design.md`): a second Worker with a public `/health` route and a Cloudflare-Access-gated `/admin/whoami` route over D1. Next:

- **Wire `/api` into its own Cloudflare Workers Build** so it auto-deploys on push to `main` (today it deploys manually via `cd api && npm run deploy`).
- **Phase 2 — newsletter, owned:** migrate the live **Buttondown** list (the homepage form currently posts to Buttondown) to a self-owned **D1** list with **Resend** for sends, behind **Turnstile** + rate limiting. Capture only email + consent timestamp; unsubscribe deletes.
- **Phase 2 — email reconciliation:** the platform brief assumed Resend for sending; this ROADMAP separately plans **iCloud+ Custom Email Domain** for the inbound mailbox (see *Email setup for the domain* below). Design SPF/DKIM/DMARC to authorize both senders (iCloud for mailbox, Resend for newsletter) while cleaning up the stale WordPress-era records.
- **Client-side lifestyle tools** (store nothing, POST nothing) — e.g. tip calculator, bill splitter, chai-premix calculator — proving the spine end-to-end alongside the newsletter.

---

## India-and-Pakistan hero regeneration — DONE (2026-06-15)

Shipped. The `india-and-pakistan-twin-dreams-divided-bound-by-hope.jpg` hero was regenerated (seed 77) to fix the cohesion gap the gallery review flagged: it now has the deep slate-blue dusk sky the old version lacked, a crenellated terracotta fort wall, and two muted kites (sage-green and cream) that sit in the muted editorial palette instead of the old all-warm sandy treatment. Manifest row and post alt text updated to match. See `CHANGELOG.md`.

---

## Email setup for the domain

The site has been on Cloudflare Workers for a while, but the DNS still carries WordPress-era email records:

```
awonderfullife.ca       TXT   "v=spf1 include:_spf.wpcloud.com ~all"
_dmarc.awonderfullife.ca TXT  "v=DMARC1;p=none;"
```

The SPF authorizes WordPress.com mail servers to send as `@awonderfullife.ca`; DMARC is in monitor-only mode. If WordPress.com no longer routes mail for this domain (almost certainly the case), the SPF is misleading and DMARC is doing nothing useful.

### Plan

**Step 1 — Decide if email is wanted.**
A personal essay blog doesn't strictly need its own email — but a single contact address (e.g., `vijay@awonderfullife.ca`, `hello@awonderfullife.ca`) is useful for readers responding to posts, and a `postmaster@` alias is good DMARC hygiene.

**Step 2 — Migrate to iCloud+ Custom Email Domain.**
Vijay has an existing iCloud+ family subscription, which includes Custom Email Domain support (up to 5 domains, 3 addresses per domain). This domain is one of them (ezziclarity.ca is another). Plan:

1. In **Apple iCloud Settings → iCloud+ → Custom Email Domain**, add `awonderfullife.ca` and follow Apple's verification flow.
2. Apple will provide the records to add at Cloudflare DNS:
   - **MX** records pointing to `mx01.mail.icloud.com` and `mx02.mail.icloud.com`
   - **TXT** verification record
   - **SPF** record (`v=spf1 include:icloud.com ~all`) — replaces the wpcloud entry
   - **DKIM** TXT/CNAME at the selector Apple provides
3. **Update DMARC** — once mail is flowing cleanly, tighten from `p=none` → `p=quarantine` → eventually `p=reject` (after a week or two at each level monitoring delivery reports).
4. Configure aliases (e.g., `vijay@awonderfullife.ca` → Vijay's iCloud inbox).
5. Test inbound and outbound delivery; verify the from-address renders correctly in major clients (Gmail, Apple Mail, Outlook).

### Risks / things to know

- The iCloud+ family plan caps at 5 domains. With ezziclarity.ca already added, this would be domain #2 of 5. Headroom is fine.
- DKIM is required for deliverability — don't skip it.
- DMARC at `p=reject` is the eventual goal but only after monitoring. `rua` reports go to a postmaster mailbox; set that up.

The exact same plan applies to **ezziclarity.ca** — see that repo's `ROADMAP.md`. The two migrations can be done back-to-back since they reuse the same iCloud+ Custom Email Domain flow.

---

## `www → apex` canonical redirect

Both `awonderfullife.ca` and `www.awonderfullife.ca` resolve and serve identical content (as of 2026-05-28, when the stale CNAME was cleaned up and www was added as a Worker custom domain). No single canonical URL is chosen yet, so search engines could in principle index both versions.

A Cloudflare Redirect Rule closes this in ~30 seconds:

- Cloudflare dashboard → `awonderfullife.ca` → **Rules → Redirect Rules → Create rule**
- Match: `Hostname equals www.awonderfullife.ca`
- Then: Static target `https://awonderfullife.ca`, preserve path + query, status `301`

Polish, not a fix.

---


## Drop `.html` from internal links

Cloudflare canonicalizes URLs without the `.html` suffix (e.g., the canonical form of `https://awonderfullife.ca/archive.html` is `https://awonderfullife.ca/archive`). Internal hrefs in the codebase still use `.html`, so every internal click goes through one 301 hop.

### Plan

Find-and-replace across all HTML files:

- `href="index.html"` → `href="."` or `href="/"`
- `href="archive.html"` → `href="archive"` (or absolute `/archive`)
- `href="about.html"` → `href="about"`
- `href="categories/<slug>.html"` → `href="categories/<slug>"`
- `href="posts/<slug>.html"` → `href="posts/<slug>"`

Verify by clicking around the local preview (`python3 -m http.server 8000`) before committing — relative vs absolute paths can interact oddly with the Cloudflare canonicalization rules.

Cosmetic, not urgent.

---

## Accepted deviations from the 2026-06-11 spec

Three items from the Quiet Magazine redesign spec were consciously dropped during implementation. They are not bugs — they are deliberate trade-offs, recorded here so any future session can revisit them with full context.

- **Manrope weight 800 never loaded.** The spec called for weight 800 for display headings; weight 700 rendered identically at the sizes used and the extra font-weight request was dropped. Revisitable if a heavier weight is ever visually needed.
- **Page background stayed pure `#ffffff`.** The spec suggested a warm off-white background; pure white was preferred in practice once the full page was visible. Revisitable if the palette shifts.
- **Post body measure stays the 800px container (~75ch).** The spec targeted 68ch for optimal readability; the 800px container (set during the May 2026 redesign) was kept for consistency. Revisitable as a CSS-only tweak.

---

## Done

See [`CHANGELOG.md`](CHANGELOG.md) for items that have shipped (the editorial redesign, the post-body cleanup, the project documentation, the www custom domain, the WordPress-era CSS cleanup).

- **Hero curation** — all 16 Picsum stand-ins replaced with a cohesive AI-generated editorial-illustration series. Shipped in the June 2026 Quiet Magazine redesign; see CHANGELOG 2026-06-11 for details and `docs/superpowers/specs/2026-06-11-image-manifest.md` for the full manifest.
- **Alt text simplification** — every hero `alt` attribute rewritten to describe the illustration content. Shipped in the same PR.
