# Roadmap

Future updates and deferred items for awonderfullife.ca. Items here have no fixed timeline — they're surfaced so any future session (Vijay's, mine, or another Claude's) sees the gaps and can pick them up at the right moment. Once an item ships, it moves to [`CHANGELOG.md`](CHANGELOG.md).

---

## Curate the hero photography

All 16 hero images in `assets/images/posts/<slug>.jpg` are **Picsum stand-ins** — deterministic, seeded by post slug. They render and the layout works, but they aren't topical to the posts. The user explicitly accepted them as placeholders during the May 2026 redesign while curated photography was deferred.

### Plan

For each of the 16 posts:

1. Search **Unsplash** (or similar editorial photo source) for 2–3 candidates relevant to the post's title and theme. Suggested keywords per post live in the original implementation plan at `docs/superpowers/plans/2026-05-27-website-redesign.md` (Task 7–11 section).
2. Pick one image per post.
3. Download via the Unsplash CDN with sizing params: `https://images.unsplash.com/<PHOTO_ID>?w=1600&q=80&fm=jpg&fit=crop&auto=format`. This serves pre-optimized images — no local resizing or tooling needed.
4. Save to `assets/images/posts/<slug>.jpg`, overwriting the Picsum stand-in.
5. Commit per category batch (Reflection / Society / Politics / Technology / Travel) so commits stay scoped.
6. While you're there: **simplify the `alt` text** to describe what the image *shows* (decorative-style or content-descriptive) rather than restating the post title. See the *Alt-text* item below.

### Risks / things to know

- Unsplash CDN URLs are stable — once you find a photo you like, the URL won't rot. But the *page* URL (`https://unsplash.com/photos/...`) does require a real visit to extract the CDN photo ID. There's no API key needed if you copy URLs by hand.
- Target file size ≤ 200KB. The `q=80` quality param gets you there most of the time; a few topical photos may run larger (~400KB) — still acceptable.
- Don't accidentally swap in copyright-restricted images. Unsplash, Pexels, and Pixabay are safe (CC-equivalent); avoid Getty/AP/Reuters.

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

## Simplify thumbnail and hero `alt` attributes

Every `<img class="post-thumb">` on the homepage and every `<img class="post-hero">` inside a post page currently uses the post's **title** as its `alt` attribute. Screen readers announce the title (from the linked `<h1>` or `<h2>`) and then the alt text — duplicating the same string.

### Plan

When the curated Unsplash photography lands (item #1 above), update each `alt` to do one of:

- **Decorative pattern:** `alt=""` if the image is purely supportive of the title. Screen readers skip it.
- **Descriptive pattern:** describe what the image *shows*, not what the post is about (e.g., `alt="A wooden desk by a window, papers and a half-finished cup of coffee"` for a Reflection-category hero). Better for SEO and for readers who can't see the image.

Pick a pattern per post; either is acceptable. Don't keep "title as alt" once curated photos exist.

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
