# Roadmap

Future updates and deferred items for awonderfullife.ca. Items here have no fixed timeline — they're surfaced so any future session (Vijay's, mine, or another Claude's) sees the gaps and can pick them up at the right moment. Once an item ships, it moves to [`CHANGELOG.md`](CHANGELOG.md).

---

## India-and-Pakistan hero regeneration

The `india-and-pakistan.jpg` illustration shipped in the June 2026 Quiet Magazine redesign and passed QC, but the gallery review rated it the weakest image for series cohesion (see `CHANGELOG.md` for the full redesign entry). All other 15 heroes are solid.

### Plan

1. Wait for the Cloudflare Workers AI free-tier daily quota to reset.
2. Run `docs/superpowers/tools/gen-hero.sh india-and-pakistan "<refined subject prompt>" <new-seed>`. Try a prompt variation that emphasises the flat editorial illustration style, terracotta/slate-blue/cream palette, and a symbolic geographic or unity motif (no faces).
3. View the result; regenerate if needed.
4. Overwrite `assets/images/posts/india-and-pakistan.jpg` and update the manifest row in `docs/superpowers/specs/2026-06-11-image-manifest.md`.
5. Open a small touch-up PR against `main`.

Small, scoped, one-image change.

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

## Done

See [`CHANGELOG.md`](CHANGELOG.md) for items that have shipped (the editorial redesign, the post-body cleanup, the project documentation, the www custom domain, the WordPress-era CSS cleanup).

- **Hero curation** — all 16 Picsum stand-ins replaced with a cohesive AI-generated editorial-illustration series. Shipped in the June 2026 Quiet Magazine redesign; see CHANGELOG 2026-06-11 for details and `docs/superpowers/specs/2026-06-11-image-manifest.md` for the full manifest.
- **Alt text simplification** — every hero `alt` attribute rewritten to describe the illustration content. Shipped in the same PR.
