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
- ✅ **Phase 2 — newsletter, owned (DONE, v2.8.0–v2.10.0):** Buttondown is replaced by a self-owned **D1** list with **Resend** sends, behind **Turnstile**. Capture (email + consent timestamp; unsubscribe deletes) is live; broadcasting is a markdown→Resend CLI; and delivery is **automated weekly (Saturday 7pm ET, DST-correct cron)** via a D1 `issues` queue + the Worker's `scheduled` handler. See `api/issues/README.md`.
  - *Remaining polish:* migrate any legacy Buttondown subscribers (CSV → D1); per-subscriber rate limiting on `/subscribe`; if the list ever reaches the thousands, move batch sends to Cloudflare Queues.
- **Phase 2 — email reconciliation:** the platform brief assumed Resend for sending; this ROADMAP separately plans **iCloud+ Custom Email Domain** for the inbound mailbox (see *Email setup for the domain* below). Design SPF/DKIM/DMARC to authorize both senders (iCloud for mailbox, Resend for newsletter) while cleaning up the stale WordPress-era records.
- **Client-side lifestyle tools** (store nothing, POST nothing) — e.g. tip calculator, bill splitter, chai-premix calculator — proving the spine end-to-end alongside the newsletter.

---

## India-and-Pakistan hero regeneration — DONE (2026-06-15)

Shipped. The `india-and-pakistan-twin-dreams-divided-bound-by-hope.jpg` hero was regenerated (seed 77) to fix the cohesion gap the gallery review flagged: it now has the deep slate-blue dusk sky the old version lacked, a crenellated terracotta fort wall, and two muted kites (sage-green and cream) that sit in the muted editorial palette instead of the old all-warm sandy treatment. Manifest row and post alt text updated to match. See `CHANGELOG.md`.

---

## Email setup for the domain — DONE (2026-06-15)

Live on **iCloud+ Custom Email Domain** (see `CHANGELOG.md`). Set up under Vijay's Apple ID ("Only Me"); there was no prior email (no MX), so it was a clean setup. MX → `mx01`/`mx02.mail.icloud.com`; SPF trimmed to `v=spf1 include:icloud.com ~all` (legacy wpcloud removed); DKIM CNAME at `sig1._domainkey`; `apple-domain` verification TXT kept; DMARC upgraded to `p=none; rua=mailto:postmaster@awonderfullife.ca; fo=1`. Addresses `postmaster@` + `v@` created (catch-all on). Verified all-green via `bash docs/superpowers/tools/check-email-dns.sh awonderfullife.ca` plus a live send test.

**Remaining:** after ~1–2 weeks of clean `rua` reports at `postmaster@`, tighten DMARC `p=none → quarantine → reject`. Keep `~all` (not `-all`). When the Phase-2 newsletter (Resend) lands, send from a subdomain (e.g. `send.awonderfullife.ca`) with its own SPF/DKIM/DMARC, leaving the apex SPF iCloud-only.

**ezziclarity.ca** is the same flow (its own repo's ROADMAP). Heads-up from the 2026-06-15 check: its iCloud records are already live, but its SPF still carries **both** `_spf.wpcloud.com` *and* `spf.titan.email` includes, and its DMARC still has no `rua` — so its cleanup needs a decision on whether Titan Email is still in use before trimming, and a `rua` target chosen.

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
