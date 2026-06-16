# Changelog

Notable changes to the website, deployment configuration, and project documentation. The detailed history lives in git; this file curates the highlights so a casual reader can scan what's happened over time without scrolling commit logs.

Every release is versioned with a semver git tag (`MAJOR.MINOR.PATCH`) on its merge commit — **major** = redesign or identity/structural shift, **minor** = new feature or notable enhancement, **patch** = fix, content, or docs. Each entry is stamped with its release time (UTC, from the merge commit) and listed newest-first. See [GitHub Releases](https://github.com/vijaybpanangi/awonderfullife/releases) and `git tag` for the full list.

## v2.16.2 — Comments: one section pane with nested comment cards (2026-06-16 20:43 UTC)

Refined the v2.16.1 styling: the **whole comments section is now the single frosted-glass pane** (gradient glass, `--glass-blur`, `--glass-rim`, edge-`.lensing` on Chromium), and each comment and the form are **translucent beveled cards nested on it**. Deliberately avoids nested `backdrop-filter` (glass-on-glass turns muddy) — only the section blurs; the cards are translucent white with a specular top edge. Recessed inputs, the raised accent pill, and the initial-avatars carry over. CSS + widget markup only.

## v2.16.1 — Comments restyled into the site's Liquid-Glass language (2026-06-16 20:33 UTC)

The v2.16.0 comment widget worked but looked utilitarian and off-brand. Restyled to match the site's design system: the form is now a **frosted-glass pane** (same recipe as the newsletter — gradient glass, `--glass-blur`, white border, the specular `--glass-rim`, and the `.lensing` edge-displacement on Chromium), with skeuomorphic depth — **recessed, tactile inputs** (inner shadow), a **raised beveled accent button** (pill, specular top edge, press state), and soft **initial-avatars** on each comment. Inputs now stack full-width correctly. CSS + widget markup only; the comment backend is unchanged.

## v2.16.0 — Comments: verified, instant-post, auto-moderated (2026-06-16 20:16 UTC)

Post comments, owned end-to-end (D1 + the API worker), in the same privacy-clean spirit as the rest of the stack:

- **Verify then post instantly.** A reader writes a comment, passes Turnstile, and confirms via a one-time **magic link** (Resend). Confirming publishes the comment **immediately** and sets a 30-day session so repeat comments skip the email step. Names are shown; emails are stored for verification only and never displayed.
- **Auto-moderation sweep, with tombstones.** The 15-minute cron checks new comments (heuristics + Cloudflare **Workers AI**); anything flagged as spam/abuse is replaced **in place** with "This comment was removed because it failed our moderation checks" rather than silently deleted. Graceful: if AI is unavailable, heuristics still run; if the signing secret is unset, comments still work (just verify per comment).
- New D1 tables (`comments`, `comment_verifications`, migration `0004`); endpoints `GET /comments`, `POST /comments`, `GET /comments/verify`; `AI` binding added. A shared, XSS-safe widget (`assets/js/comments.js`, renders user text as `textContent` only) is embedded on all 16 posts.
- 7 new Vitest tests (verify flow, instant session post, Turnstile gate, sweep tombstoning + clean-pass). Reuses the existing Resend key and cron.

## v2.15.1 — Fix: remove invalid _redirects that blocked the deploy (2026-06-16 18:08 UTC)

The `www → apex` rule in `_redirects` used an absolute (host-based) URL, which Cloudflare's static-asset `_redirects` rejects (`Only relative URLs are allowed`, code 100324) — and that failed the **entire** v2.15.0 deploy, so none of it went live until caught. Removed the file. `www → apex` will instead be a Cloudflare **Redirect Rule** (dashboard, owner action). Everything else in v2.15.0 is verified live: 1-year asset caching, all five security headers, RSS, clean URLs, rounded 3:2 images, and the author sidebar.

## v2.15.0 — Site polish: performance, readability, RSS, author sidebar (2026-06-16 17:48 UTC)

A sweep of the website-review punch list plus two design touches:

- **Rounded corners** (14px) on every hero and card; image aspect switched to **3:2** to match the source art (ends the 16:9 crop that was clipping composed-cover titles).
- **Author sidebar on posts.** Each article now has a sticky author card in a right rail (avatar, name, one-line bio, link to About) — visible while reading; stacks below on narrow screens. The post column is the article + rail; the homepage author line was relocated here.
- **Readability:** post body capped to a ~70-character measure (was the full 800px ≈ 90ch).
- **Performance:** `_headers` gives `/assets/*` a one-year immutable cache (was `max-age=0`); card thumbnails are now 640px with `srcset` (the full 1536px hero was loading into ~500px cards); featured/hero images stay full-res for LCP.
- **Security headers:** `X-Content-Type-Options`, `Referrer-Policy`, `HSTS`, `X-Frame-Options`, `Permissions-Policy`.
- **Clean URLs:** dropped `.html` from internal links, canonicals, OG/Twitter URLs, and the sitemap (no more redirect hop; canonical matches the served URL).
- **RSS feed** at `/feed.xml` (+ `<link rel=alternate>` on every page).
- **`www → apex` 301** via `_redirects` (falls back to a dashboard Redirect Rule if host-based `_redirects` isn't honored — verifying post-deploy).

## v2.14.0 — Hero refresh complete: all 16 posts (2026-06-16 17:05 UTC)

Finished the hero-image regeneration begun in v2.12.1. Every post now carries a photoreal ChatGPT (`gpt-image-1`) hero, optimized PNG→JPG (137–405 KB):

- **9 composed covers** (title/byline baked in) use the `.post-header.is-hero-titled` treatment so the cover carries the masthead while the HTML header stays in the DOM for SEO/screen readers; these also serve as rich `og:image` social cards.
- **7 textless** heroes keep the normal HTML header.
- Every alt text rewritten to describe the scene and is **em-dash-free** (clears the last stray alt em dash flagged in v2.13.0).
- Image manifest fully refreshed; source PNGs stay out of git and the asset bundle.

Wired by parallel subagents (one per post): each viewed its image, classified composed vs textless, set the header treatment, and wrote the alt; verified header classes and zero alt em dashes. The series is now visually consistent (photoreal throughout) rather than mixed.

## v2.13.0 — Editorial formatting sweep across all posts (2026-06-16 15:06 UTC)

A site-wide pass to bring every post to a clean, professional, NYT-style editorial standard (font unchanged — still Manrope):

- **Typography:** body 18px to 17px, line-height 1.8 to 1.7, tighter paragraph/heading rhythm, and **left-aligned** (was justified) for even spacing and a news-like read.
- **Emphasis:** stripped the inline bold/italic "emphasis spam" (one post had 81 bolded phrases) down to NYT level — bold/italic now only on reference labels, list lead-ins, and titles of works.
- **Artifacts:** converted all leftover WordPress-export `[text](url)` links and raw `##` headings to real HTML; rebuilt Sources sections as `.post-references` lists with working links.
- **Closings:** reworked promotional/CTA endings ("join the conversation", "drop your thoughts in the comments" — the site has no comments) into calm, reflective closes in the author's voice.
- **No em dashes:** removed every em dash from post bodies and the newsletter status messages (kept one inside a cited article's real headline), replacing with natural punctuation.
- **Canadian English:** prose now uses honour, neighbour, defence, travelled, fuelled, labours, kilometre; proper nouns/URLs/code left intact.

Mechanically assisted by parallel subagents, one per post, against a shared style spec; re-audited to zero artifacts/em dashes and verified structurally.

## v2.12.2 — Post fixes: data-dilemma references + iOS 18.5 heading (2026-06-16 13:39 UTC)

Fixed leftover WordPress-export artifacts in two posts:

- **Data Dilemma:** the *Sources & References* section is now a proper, smaller-font list with **working hyperlinks** — the links had been stuck as literal `[text](url)` markdown. Source names stay readable; citation text is muted and set apart with a top rule (new `.post-references` style).
- **Siri / iOS 18.5:** a raw `## …` markdown heading at the top of the post is now a real `<h2>`.

The same raw `[text](url)` link artifact still exists in four other posts (2024-election, how-integrity, apple-intelligence, dream-big) — to be cleaned in the upcoming formatting sweep.

## v2.12.1 — Hero refresh (batch 1): photoreal composed covers on 5 posts (2026-06-16 00:39 UTC)

First batch of the hero-image regeneration. Replaced the flat-illustration heroes on five posts with photoreal images generated via ChatGPT (`gpt-image-1`), optimized PNG→JPG (2–3 MB → 160–405 KB):

- **Four composed "cover" heroes** (Leadership Contrasts, Whispers of Wanderlust, An Ode to Winter, Wanderlust Diaries) carry the kicker/title/byline **in the image**. Those posts now hide the duplicate HTML header via a new `.post-header.is-hero-titled` rule — the header stays in the DOM (real `<h1>`, kicker, byline) for SEO, JSON-LD, and screen readers, but the cover visually carries the masthead. As a bonus these become rich `og:image` social-share cards.
- **The Trump vs. Harris hero is textless** and keeps the normal HTML header.
- Alt text rewritten to describe each new scene; image manifest updated; source PNGs kept out of git/the asset bundle (`assets/staging-images/`).

The remaining 11 heroes will follow in later batches to restore series cohesion.

## v2.12.0 — Compose UI: rich editor, sign-out, and custom scheduling (2026-06-15 23:44 UTC)

Three upgrades to the compose experience, plus the scheduling model behind it:

- **Rich editor.** The Markdown textarea is now a **Toast UI Editor** (WYSIWYG with a formatting toolbar — headings, bold/italic/strike, lists, links, quote, code). It still exports Markdown, so the email pipeline is unchanged.
- **Sign out.** A header button to Cloudflare Access's logout (`/cdn-cgi/access/logout`).
- **Custom scheduling.** Each issue now carries its **own send time** (migration `0003` adds `scheduled_at`). The compose UI (and the CLI's new `--at "<ET datetime>"`) let you pick **next Saturday 7pm ET** (default) or a **custom Eastern-Time** time. The cron moved from two fixed Saturday triggers to a **15-minute tick** that sends any issue whose time has arrived — also more resilient (a missed tick is caught by the next). ET→UTC conversion is DST-correct (`src/schedule.mjs`, shared with the CLI).
- **Behavior change:** queueing several issues no longer drips them one-per-Saturday — each sends at its own chosen time (shown in the queue list). Leave two on the default and they both go that Saturday; set custom times to space them.
- 5 new Vitest tests (schedule util DST/next-Saturday, due-based send, custom/past-time validation); 37 total.

## v2.11.0 — Newsletter compose UI (login-protected, in-browser authoring) (2026-06-15 23:23 UTC)

A web UI for writing the newsletter — no terminal needed. Served by the API worker at **`api.awonderfullife.ca/admin/compose`**, behind the **existing Cloudflare Access** login (gated at the edge and re-verified in-code). Schedule-only by design:

- **Compose** subject + preheader + Markdown body, with a live **Preview** (rendered through the exact email template in an iframe).
- **Send test to me** — sends one copy to the signed-in admin's address (never the list).
- **Queue for Saturday** — adds the rendered issue to the D1 queue the weekly cron drains; a list of queued/recently-sent issues with one-click **Unqueue**.
- There is deliberately **no "broadcast now"** button — full sends only go through the Saturday 7pm ET cron.
- **Shared render module** (`src/render.mjs`) is now the single source of the email template, imported by both the worker (compose/preview/test) and the CLI — so they can't drift. The CLI (`--queue`/`--test`/`--dry-run`) is unchanged.
- New admin endpoints (all Access-gated): `GET /admin/compose`, `GET|POST /admin/issues`, `POST /admin/issues/preview`, `POST /admin/issues/test`, `POST /admin/issues/unqueue`. 9 new Vitest tests (auth gate, queue, list, preview, test-send, unqueue).

## v2.10.1 — Fix: Cloudflare's non-standard cron day-of-week (deploy was rejected) (2026-06-15 23:08 UTC)

The v2.10.0 cron expressions (`0 23 * * 6`, `0 0 * * 0`) failed to deploy: **Cloudflare's day-of-week field is non-standard — `1`=Sunday … `7`=Saturday**, not the usual `0`/`6`. So `0` was rejected outright (API error 10100) and `6` would have meant *Friday*, not Saturday. Switched both to the abbreviations Cloudflare recommends — `0 23 * * SAT` (7pm EDT) and `0 0 * * SUN` (7pm EST) — which now register cleanly. The DST code-gate was already correct and unchanged; this was purely the trigger syntax.

## v2.10.0 — Newsletter automation: scheduled weekly send (Saturday 7pm ET) (2026-06-15 22:59 UTC)

The newsletter now sends itself — no laptop required. Authoring stays manual (you still write each issue); **delivery** is automated:

- **Queue, not send-now.** A new D1 `issues` table (migration `0002`) holds rendered issues. The send CLI gains `--queue` (enqueue an issue), `--queue-list` (see what's pending), and `--unqueue <id>` (pull one back). Each issue is rendered **once** at queue time with a `{{UNSUB_URL}}` placeholder.
- **Weekly cron.** The Worker gained a `scheduled` handler firing **Saturday 7pm America/New_York**, sending the oldest queued issue to all active subscribers via Resend's **batch** endpoint (per-recipient unsubscribe link + `List-Unsubscribe`, swapped from the placeholder), then marking it `sent`. Empty queue → nothing sends.
- **DST-correct.** Cloudflare crons are UTC-only, so two triggers fire (`0 23 * * 6` and `0 0 * * 0`); the handler gates on the real `America/New_York` clock (`Intl`), so exactly one passes each week — genuinely 7pm ET in both EDT and EST, never drifting to 6pm in winter.
- **Key moves server-side.** Scheduled sends use `RESEND_API_KEY` as a **Wrangler secret** (not a laptop env var); `NEWSLETTER_FROM`/`NEWSLETTER_REPLY_TO` are non-secret vars. The immediate/`--test`/`--dry-run` CLI paths are unchanged.
- Vitest coverage for the DST gate (EDT/EST/off-twins/non-Saturday) and the queue→send→mark-sent flow. Scale note: batch is chunked at 100; a list in the thousands would warrant Cloudflare Queues (documented, not built).

## v2.9.2 — Newsletter CLI: clear errors for placeholder key/email (2026-06-15 21:44 UTC)

Hardened the send CLI so pasting the literal placeholders (`re_…`, `you@…`) fails with a plain‑English message instead of a cryptic `Cannot convert argument to a ByteString … value 8230` (the typographic ellipsis is non‑ASCII and broke the HTTP header). It now validates `RESEND_API_KEY` shape (ASCII `re_…`) and the `--test` address before sending. Confirmed delivery: the example issue rendered and landed in‑inbox (not spam) from `hello@send.awonderfullife.ca`.

## v2.9.1 — Newsletter: Reply-To to v@awonderfullife.ca (2026-06-15 21:39 UTC)

The send CLI now sets `reply_to` on every issue (default `v@awonderfullife.ca`, overridable via `NEWSLETTER_REPLY_TO`), so replies reach the real iCloud inbox rather than the send-only `hello@send.awonderfullife.ca`. **Pipeline verified live:** the `send.awonderfullife.ca` Resend domain is verified (Cloudflare auto-configure: SPF/DKIM/MX, region us-east-1), and a real test issue sent successfully (`sent=1`).

## v2.9.0 — Newsletter send CLI: markdown → Resend broadcast (2026-06-15 21:12 UTC)

Phase 2b tooling — the **broadcast** side of the owned newsletter. A local Node CLI (`api/scripts/send-issue.mjs`, run via `npm run send`) renders a Markdown issue — `---` frontmatter (`subject`, optional `preheader`) + a Markdown body via `marked` — into an email‑safe, inline‑styled HTML template (masthead + body + footer) with a plain‑text part, and sends it through **Resend** to `status='active'` subscribers pulled from D1, injecting each subscriber's `/unsubscribe?token=…` link and a `List-Unsubscribe` header. `--test <email>` sends to one address; `--dry-run` writes `api/issues/.preview.html` and sends nothing (works fully offline). Issues are dated Markdown files in `api/issues/`. **Sending runs locally, not in the Worker** (the Worker only handles signup/unsubscribe). Owner prerequisites before a real send: a Resend account + a verified `send.awonderfullife.ca` sending domain (SPF/DKIM/DMARC in Cloudflare) + `RESEND_API_KEY`/`NEWSLETTER_FROM` in the local env — see `api/issues/README.md`. Verified offline via `--dry-run`; not yet exercised against a live Resend domain.

## v2.8.0 — Newsletter live: owned signup (Turnstile + D1) replaces Buttondown (2026-06-15 20:08 UTC)

The newsletter is now fully owned end-to-end. The signup form on all 18 pages (home, About, the 16 posts) was rewired from the Buttondown embed to a `fetch` POST to `api.awonderfullife.ca/subscribe`, gated by a Cloudflare **Turnstile** widget, with inline success/error (no redirect). The `v2.5.0` backend was deployed (the `TURNSTILE_SECRET` secret set, the `subscribers` D1 table migrated). Verified live: `/subscribe` rejects bogus tokens (403 `turnstile_failed`) and bad emails (400), the CORS preflight returns 204 with the site origin, and `/unsubscribe` serves. Single opt-in; **Buttondown retired**. Sending issues via Resend is the next phase (see `ROADMAP.md`).

## v2.7.0 — Edge-lensing Liquid Glass, site-wide (Chromium-only) (2026-06-15 19:51 UTC)

Promoted the edge-lensing prototype (PR #16) to a full site-wide feature. An inline SVG `feTurbulence → feDisplacementMap` filter (`#edge-lensing`) is now on every page, and the floating capsule **header** + the **newsletter** card route their `backdrop-filter` through it (`.lensing` class) so the content seen *through* the glass refracts/bends, not just blurs — the closest pure CSS gets to Apple's Liquid Glass. Triple-gated: opt-in `.lensing`, an `@supports (backdrop-filter: url())` block (Chromium-only — Safari/Firefox keep the flat `blur()+saturate()` glass), and a `prefers-reduced-motion: reduce` fallback that drops the displacement for a calm heavy blur. **Known limitation:** on Chromium, the header rim can shimmer while content scrolls under it (the backdrop re-samples per frame); accepted as a deliberate trade for the effect. Rolled to all 24 pages (SVG inlined per page; no build/include step). See `docs/superpowers/specs/2026-06-15-liquid-glass-design.md`.

## v2.6.2 — Justify post body text (2026-06-15 19:47 UTC)

Set the post body (`.post-content`) to `text-align: justify` with `hyphens: auto`, so paragraph blocks have even left **and** right edges — a tidier, more "set" reading column. Hyphenation (which relies on each page's `lang="en"`) prevents justification from opening large inter-word gaps. CSS-only; applies to all 16 posts.

## v2.6.1 — docs: PR-level release table + CHANGELOG for the newsletter & capsule releases (2026-06-15 19:02 UTC)

Documentation-only. Rebuilt the README "Recent updates" into a PR-level **Release history** table (one row per release: version, UTC time, PR link, summary), and added the CHANGELOG entries below for `v2.5.0` and `v2.6.0` (whose feature PRs were built by subagents and merged without docs). Tagged both on their merge commits.

## v2.6.0 — Floating Liquid Glass capsule nav (2026-06-15 18:59 UTC)

Evolved the blog masthead from a full-width frosted bar into a **floating Liquid Glass capsule** — a detached, centered, rounded-pill glass bar inset from the viewport edges, with the specular rim and a soft floating shadow. Scoped to `header:not(.post-header)` so it never bleeds onto post titles (the bug fixed in v2.4.2). CSS-only — no markup changes across the 24 pages; the `@supports not (backdrop-filter)` fallback and a tighter mobile radius are preserved. Built via subagent in an isolated worktree (PR #12).

## v2.5.0 — Owned newsletter capture: /subscribe + /unsubscribe + Turnstile (2026-06-15 18:56 UTC)

Stood up the owned-newsletter **capture** backend on the API worker (`api.awonderfullife.ca`) — the first step of "own the list" off Buttondown. New D1 `subscribers` table (migration `0001`), `POST /subscribe` (email validation + Cloudflare **Turnstile** verification + CORS for the site origins + idempotent upsert with a per-subscriber `unsub_token`), `GET /unsubscribe?token=…` (deletes the row, returns a branded page), and an injectable `verifyTurnstile` (so tests can stub it). **15/15 Vitest tests pass.** Single opt-in; sending issues via Resend is a later phase. The live **Buttondown form is untouched** — rewiring it to the API is a deliberate follow-up (PR2) once the owner: creates Turnstile keys, `wrangler secret put TURNSTILE_SECRET`, `wrangler d1 migrations apply awonderfullife-api --remote`, and `cd api && npm run deploy`. Built via subagent in an isolated worktree (PR #11).

## v2.4.2 — Fix: site-header glass bleeding onto the post title block (2026-06-15 18:52 UTC)

Bug fix to the v2.4.0 Liquid Glass header. Post pages use `<header class="post-header">` for the title block, so the bare `header { … }` selector (frosted sticky bar) was also styling the post title — drawing a stray frosted/rounded panel behind the headline. Scoped the site-header rules (and the `@supports` fallback) to `header:not(.post-header)`, so the glass applies only to the site masthead and the post title renders clean. CSS-only.

## v2.4.1 — Release governance: semver tags + versioned changelog + doc currency (2026-06-15 17:39 UTC)

Documentation-only. Adopted explicit semver release numbering: created retroactive git tags for every release back to `v1.0.0` (each on its merge commit), reorganized this CHANGELOG so every entry carries its version, and backfilled the two releases that had shipped without an entry (`v2.2.1` email DNS checker/plan, `v2.3.1` contact email surfaced). Refreshed `CLAUDE.md` (Liquid Glass design-system layer + the sticky frosted header + a Releases & versioning note) and the README "Recent updates" table. No site or code change.

## v2.4.0 — Liquid Glass editorial accents (2026-06-15 17:10 UTC)

Blended an Apple-style Liquid Glass material into the blog's crisp editorial design — selectively, to keep "crispness over decoration":

- **Frosted sticky header.** The masthead is now a compact, sticky frosted bar (title + tagline inline, nav right) that blurs, brightens, and saturates the post text and hero illustrations scrolling beneath it — the signature glass moment, and the one place glass genuinely belongs on a white editorial site.
- **Frosted newsletter card** and **glassy faceted-browse chips**, each with a specular bevel (bright top edge + faint bright base + inner light ring).
- A **whisper of background depth** — a barely-there accent-blue glow at the very top — gives the glass something to refract at rest; the body and the homepage card grid stay crisp white.
- Glass tokens (`--glass-bg`, `--glass-blur` = `blur(18px) saturate(1.8) brightness(1.06)`, `--glass-rim`) drive it; an `@supports not (backdrop-filter)` fallback keeps the surfaces near-opaque where unsupported. CSS-only — no markup changes, so it applies on every page.

Note: true Liquid Glass edge-refraction (real-time lensing) needs GPU shaders and isn't replicable in pure CSS; this emulates the material via frost + brightness/saturation + specular bevel.

## v2.3.1 — Contact email surfaced (v@) on About + Person JSON-LD (2026-06-15 15:05 UTC)

Surfaced `v@awonderfullife.ca` as the blog's public contact, now that the mailbox is live. A warm, in-voice line was added at the end of the About prose (`mailto:v@awonderfullife.ca`), and `"email": "v@awonderfullife.ca"` was added to the `Person` node of the schema.org `@graph` (plain address, schema-correct) — propagated across all 24 already-injected pages, with the `seo-inject.py` generator updated so future posts inherit it. `postmaster@` stays unpublished (infrastructure only); the footer and newsletter card were left untouched. Placement was chosen via a read-only subagent analysis of the About voice and the generator's skip-guard.

## v2.3.0 — Email live via iCloud+ Custom Email Domain (2026-06-15 14:28 UTC)

The domain now sends and receives mail through **iCloud+ Custom Email Domain** (set up under Vijay's Apple ID, "Only Me"). There was no email before — no MX existed — so this was a clean setup, not a migration. Records were published via Apple's Cloudflare integration, then cleaned up by hand:

- **MX** → `mx01`/`mx02.mail.icloud.com` (priority 10).
- **SPF** trimmed to `v=spf1 include:icloud.com ~all` (the legacy `_spf.wpcloud.com` WordPress-era include was removed).
- **DKIM** CNAME at `sig1._domainkey` → `…icloudmailadmin.com`.
- **Verification** TXT `apple-domain=…` (kept permanently — Apple re-validates).
- **DMARC** upgraded from the inert `v=DMARC1;p=none;` to `v=DMARC1; p=none; rua=mailto:postmaster@awonderfullife.ca; fo=1`, so aggregate reports now flow.
- **Addresses:** `postmaster@awonderfullife.ca` and `v@awonderfullife.ca` (catch-all on).

Verified all-green with `docs/superpowers/tools/check-email-dns.sh awonderfullife.ca` and a live send test (mail from `v@` and `postmaster@` delivered to an external inbox). The record set was checked against Apple/Cloudflare docs by a three-subagent verification pass before any change. DMARC stays at `p=none` for ~1–2 weeks of report monitoring, then tightens to `quarantine` → `reject`.

## v2.2.1 — Email DNS checker + hardened iCloud email plan (2026-06-15 13:27 UTC)

Pre-work for the email setup. Added `docs/superpowers/tools/check-email-dns.sh` — a DNS-over-HTTPS smoke-test (dig isn't available in the environment) that checks MX / SPF / DKIM(`sig1`) / DMARC / `apple-domain` against the expected iCloud values and flags Cloudflare Email-Routing leftovers and duplicate SPF records (reusable for any domain via a `$1` argument). The iCloud email plan in `ROADMAP.md` was hardened by a three-subagent validation pass (record set verified against Apple docs; safeguards added: keep the verification TXT permanently, watch the Cloudflare Email-Routing locked-record bug, keep exactly one SPF record, keep `~all` not `-all`). Tooling + planning only — no site or DNS change.

## v2.2.0 — Technical SEO foundation (no copy, design, or URL changes) (2026-06-15 04:39 UTC)

The blog had no canonical tags, no Open Graph, no Twitter cards, and no structured data at all. This adds the full metadata layer across all 24 pages, plus the site's first `sitemap.xml` and `robots.txt`. No visible copy, design, or URLs changed; the `/api` worker is untouched. The JSON-LD reuses each page's own title, meta description, and (for posts) `<h1>`, byline date, and category verbatim, so no new prose was authored. Spec at `docs/superpowers/specs/2026-06-15-blog-seo-foundation-design.md`.

- **Absolute self-canonical** on every page (home to apex root, the rest to their own `.html` URL, matching the links actually served).
- **Open Graph + Twitter Card** on every page: title, description, url, site_name, locale, type (`article` for the 16 posts, `website` for the other 8), and an absolute image. Posts also carry `article:published_time` / `author` / `section`. Twitter uses `summary_large_image`.
- **og:image strategy:** posts use their own hero (1600x896); the About page uses the author portrait; home, archive, and the 5 category pages use a new brand-default illustration (`assets/images/og-default.jpg`, generated in the existing flat-editorial series style). That is the only new asset.
- **JSON-LD `@graph`** before `</head>` on every page: a shared `WebSite` + `Person` (Vijay Panangipally, `sameAs` intentionally omitted until real socials exist) + `Blog`, plus a per-page node. The 16 posts are `BlogPosting` nodes with headline, description, image, `datePublished` (ISO 8601 parsed from the byline), author, publisher, and `articleSection`. Other pages are `CollectionPage` / `AboutPage`. Serialized with non-ASCII preserved.
- **sitemap.xml** (new): sitemaps 0.9, 24 absolute `<loc>`s, post `<lastmod>` set to each post's published date.
- **robots.txt** (new): allows all, points to the sitemap. (Cloudflare's managed-robots feature may prepend a block on the live response, as on ezziclarity; benign for search indexing, noted in ROADMAP.)
- **Tooling:** an idempotent injector kept at `docs/superpowers/tools/seo-inject.py` (the `docs/` tree is excluded from the public bundle, so it never deploys); re-run after adding a post to give it the same block. Skips pages that already have JSON-LD, so re-runs are no-ops.

**Verification.** All 24 pages parse as valid JSON-LD (16 as `BlogPosting` with valid ISO dates, author, and absolute image); zero relative canonical/og/image URLs; `sitemap.xml` well-formed with 24 absolute locs; idempotent re-run is a byte-identical no-op; local HTTP sweep returned 200 for all 24 pages plus `/sitemap.xml` and `/robots.txt`. Cross-checked by independent validation passes plus an adversarial control pass.

## v2.1.1 — India-Pakistan hero regenerated (series cohesion touch-up) (2026-06-15 04:04 UTC)

Closed the one deferred item from the June 2026 Quiet Magazine redesign. The `india-and-pakistan-twin-dreams-divided-bound-by-hope.jpg` hero, which the gallery review had flagged as the weakest of the sixteen for series cohesion (all-warm sandy palette, no slate-blue anchor, grainy fills), was regenerated via `gen-hero.sh` (seed 77). The new illustration carries the deep slate-blue dusk sky the series wants, a crenellated terracotta fort wall, and two muted kites (sage-green and cream) in the editorial palette. The post alt text and the image manifest row were updated to match. One-image change, no other content touched.

## v2.1.0 — API spine (Phase 1): `api.awonderfullife.ca` (2026-06-14 01:40 UTC)

The first piece of the platform backend. A **second, independent Cloudflare Worker** (`awonderfullife-api`) now runs at **`api.awonderfullife.ca`**, alongside the static blog — which is untouched. This begins turning awonderfullife.ca from a static blog into a personal platform ("one backend, many faces"). Spec at `docs/superpowers/specs/2026-06-13-api-spine-foundation-design.md`; plan at `docs/superpowers/plans/2026-06-13-api-spine-foundation.md`.

### What shipped

- **`GET /health`** — public liveness probe (`{status:"ok", time}`).
- **`GET /admin/whoami`** — gated by **Cloudflare Access** (`api.awonderfullife.ca/admin*`, policy = Vijay's personal email); returns the verified email + a **D1** connectivity flag (`SELECT 1`).
- **Defence in depth:** the worker independently verifies the Access JWT (`src/access.ts`, via `jose` over WebCrypto) — safe even if reached directly. `workers_dev` disabled.
- **TypeScript** on the Workers runtime, no framework; **Vitest** (`@cloudflare/vitest-pool-workers`) with **9 passing tests** (router, JWT-verification matrix, gated route over a local D1).
- **D1** database `awonderfullife-api` bound as `DB` — no application schema yet (that's Phase 2's owned newsletter list).
- **Secrets** (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`) live as Wrangler secrets, never in the repo. `.assetsignore` extended to keep `/api` source out of the public asset bundle.

### Deploy model

The API worker deploys **manually** (`cd api && npm run deploy`); it is not part of the static site's push-to-`main` build. Wiring it into its own Workers Build is tracked in `ROADMAP.md`.

---

## v2.0.0 — Quiet Magazine redesign + generated illustration series (2026-06-11 21:43 UTC)

A full visual redesign of the site, shipped on branch `redesign/quiet-magazine` (PR: Quiet Magazine redesign + generated illustration series). The centerpiece is replacing all 16 Picsum stand-in heroes with a cohesive AI-generated editorial-illustration series, while simultaneously overhauling the homepage, category pages, and single-post layout. Spec at `docs/superpowers/specs/2026-06-11-quiet-magazine-redesign-design.md`; implementation plan at `docs/superpowers/plans/`; image manifest (all 16 images with seeds, prompts, and alt texts) at `docs/superpowers/specs/2026-06-11-image-manifest.md`.

### Design

- **Homepage rebuilt** as a featured opener (first post at full width with illustration) + a 2-column illustrated card grid for the remaining 15 posts.
- **Category pages** converted from plain archive lists to illustrated card grids — faceted browsing strip preserved.
- **Single posts:** display-scale titles (`clamp(2.2rem, 5vw, 3.2rem)`), breakout heroes (a `--breakout` clamp() on `.post-hero` lets the image bleed beyond the 800px text column), `· N MIN READ` bylines (reading time statically computed as words ÷ 200), and prev/next footer navigation.
- **About page:** author photo switched from round portrait to editorial 180×180px square frame.
- **Body text** scaled from 17px to 18px equivalent (1.125rem).
- **Dead thumbnail-list CSS pruned** — `.post-item`, `.post-thumb`, and related rules removed.
- Stylesheet grew from 421 lines to **480 lines** with new components: `.featured`, `.card-grid`, `.post-nav`, `.container--wide`, breakout hero rules.

### Illustration series

- **All 16 Picsum stand-ins replaced** with a cohesive AI-generated editorial-illustration series produced via Cloudflare Workers AI `flux-1-schnell` (free tier) using the script at `docs/superpowers/tools/gen-hero.sh`.
- Flat editorial style, terracotta/slate-blue/cream palette, consistent across all 16 images.
- Every image individually viewed and QC'd; several regenerated for style, quality, or series cohesion.
- People-posts (Ratan Tata, Trump vs Harris, India & Pakistan) use **symbolic no-likeness scenes** — no faces.
- Full manifest with seeds, prompts, alt texts, and file sizes: `docs/superpowers/specs/2026-06-11-image-manifest.md`.
- Total hero image payload: **1.5MB for 16 images**.
- **Alt text rewritten per image** — describes the illustration content rather than restating the post title. Closes the *Alt text simplification* ROADMAP item.

### Known follow-up

- **India-and-Pakistan hero regeneration.** The image passed QC and the gallery review rated it weakest for series cohesion. It will be regenerated for stronger cohesion in a follow-up PR once the Workers AI daily free quota resets.

---

## v1.0.0 — Editorial direction launch (2026-05-28 17:53 UTC)

First formal release. Marks the current state of the project as a stable milestone after the May 2026 redesign, the post-body cleanup, the infrastructure work (www custom domain, `.assetsignore`), and the full documentation surface (README, CLAUDE.md, CHANGELOG, ROADMAP, 12-page Wiki). Full release notes at <https://github.com/vijaybpanangi/awonderfullife/releases/tag/v1.0.0>.

### GitHub Wiki

- **Initial signpost page added.** A minimal `Home` page was created on the repo's GitHub Wiki tab as a way-finder pointing visitors back to the canonical in-repo docs.
- **Full multi-page Wiki built out.** Expanded into a navigable twelve-page wiki with a sidebar. Pages: [Home](https://github.com/vijaybpanangi/awonderfullife/wiki), [About the Blog](https://github.com/vijaybpanangi/awonderfullife/wiki/About-the-Blog), [The Five Categories](https://github.com/vijaybpanangi/awonderfullife/wiki/The-Five-Categories), [Post Catalog](https://github.com/vijaybpanangi/awonderfullife/wiki/Post-Catalog), [Site Architecture](https://github.com/vijaybpanangi/awonderfullife/wiki/Site-Architecture), [Design System](https://github.com/vijaybpanangi/awonderfullife/wiki/Design-System), [Adding a Post](https://github.com/vijaybpanangi/awonderfullife/wiki/Adding-a-Post), [Hero Photography](https://github.com/vijaybpanangi/awonderfullife/wiki/Hero-Photography), [Deployment](https://github.com/vijaybpanangi/awonderfullife/wiki/Deployment), [The May 2026 Redesign](https://github.com/vijaybpanangi/awonderfullife/wiki/The-May-2026-Redesign), [Roadmap](https://github.com/vijaybpanangi/awonderfullife/wiki/Roadmap), [AI-Assisted Development](https://github.com/vijaybpanangi/awonderfullife/wiki/AI-Assisted-Development). Repo files remain canonical; the Wiki is long-form narrative and reference material that wouldn't fit in the repo without bloating it.

### Infrastructure

- **`www.awonderfullife.ca` now resolves.** Added as a second Custom Domain on the Cloudflare Worker. Previously the `www` subdomain returned HTTP 522 (Cloudflare reached an origin that wasn't responding); now both apex and `www` serve identical content from the same Worker.
- **Stale DNS record removed.** Deleted a lingering `CNAME` record for `www.awonderfullife.ca` that was the root cause of the 522. It was a leftover from earlier domain setup and pointed at an origin that no longer existed. With it gone, the new Custom Domain mapping could be claimed.

### Documentation

- **`README.md`** — public-facing project overview for anyone landing on the GitHub repo home (tagline, live URL, what the blog is, the five categories, tech stack, how to preview/deploy, the three-places rule for adding a post).
- **`CLAUDE.md`** — operator's manual for Claude Code sessions working in this repo: architecture, file structure, kicker and faceted-nav patterns, the post-body cleanup history, deferred follow-ups.
- **`docs/superpowers/README.md`** — explains the brainstorm → spec → plan → execute workflow used on this project, plus pointers to the existing redesign spec and plan.
- **`.assetsignore` extended** to keep `README.md`, `CLAUDE.md`, and `CHANGELOG.md` out of the public asset bundle. Visible on GitHub, hidden from the live site — consistent with how `docs/`, `.gitignore`, and `wrangler.jsonc` were already excluded.
- **GitHub About panel filled in** — description, live website link, and topics tags (`personal-blog`, `essays`, `static-site`, `html-css`, `cloudflare-workers`, `editorial-design`, `responsive-design`, `canada`).

### Deferred / known follow-ups

- **`www → apex` canonical redirect.** Both variants serve identical content, but no single canonical URL is chosen yet. A Cloudflare Redirect Rule (match `Hostname equals www.awonderfullife.ca`, static target `https://awonderfullife.ca`, preserve path + query, status 301) would close this. Polish, not a fix.
- **Replace Picsum stand-in hero images** in `assets/images/posts/<slug>.jpg` with curated Unsplash photography. All 16 current images are deterministic Picsum stand-ins (seeded by slug) — they render, but they're not topical.
- **Simplify thumbnail / hero `alt` attributes.** They currently restate the post title; the linked title already announces it to screen readers. Cleaner fix: `alt=""` for decorative thumbs, descriptive alt for heroes once curated photography lands.
- **Drop `.html` from internal links.** Cloudflare canonicalizes URLs without the suffix; current internal hrefs trigger a 301 hop per click. Cosmetic.

---

## 2026-05-27 — Full editorial redesign

A complete redesign moved the site from a generic Medium-lite layout to a typography-led editorial direction with hero photography, faceted browsing, and a five-category taxonomy. **17 commits** to `main`, all deployed via Cloudflare Workers with Static Assets.

### Design system

- New stylesheet (`assets/css/style.css`): **Manrope** throughout (humanist sans, GE-Inspira-adjacent), crisp white + ink + editorial blue palette, **800px container** (widened from 680px).
- All design tokens centralized in `:root` (`--color-bg`, `--color-text`, `--color-accent`, `--font`, `--max-width`, etc.).
- Editorial hierarchy on every list and post: kicker (category, uppercase, tracked, accent blue) → title → rule/byline → excerpt/body.

### Pages and structure

- **`index.html`** rewritten as a thumbnail-led list of all 16 posts (was 5). Each row: thumbnail + kicker + title + excerpt + date.
- **`archive.html`** rebuilt as a year-grouped compact list with a faceted browsing strip at the top (category pills + period chips, anchor links to year sections below).
- **Five new category pages** at `categories/{reflection,society,politics,technology,travel}.html`. Same faceted nav, each filtered to its category. The "All" pill (back to archive) plus each category pill on every browse page.
- **All 16 post pages** got a category kicker, uppercase byline, and a hero image slot.
- **`about.html`** font upgrade to Manrope (layout intentionally preserved).
- **Kickers became clickable.** Every "REFLECTION", "POLITICS", etc., on the homepage and inside each post now links to the relevant category page.

### Imagery

- **16 Picsum stand-in hero images** sourced (deterministic URLs seeded by slug) and committed to `assets/images/posts/`. Placeholders pending curated photography.

### Content cleanup

- **Cleaned all 16 post bodies** of WordPress import artifacts: stray `</h2></h3>` tags appearing at every paragraph break, and raw `**bold**` / `*italic*` / `***bold-italic***` markdown markers that were never converted to HTML.
- **Trump vs Harris** scorecard rebuilt as a real `<table>` (was a flattened single-paragraph blob).
- **Ratan Tata** Longfellow couplet rendered as a `<blockquote>` (was orphaned italic markdown across two paragraphs).
- **Apple-intelligence post** title mismatch fixed: homepage/archive listings now match the post's actual `<h1>` ("How Apple's AI Enhances Everyday Life: A Review").

### Infrastructure

- **`wrangler.jsonc`** added to repo — Cloudflare Worker configuration is now version-controlled.
- **`.assetsignore`** added to keep `.git/`, `.wrangler/`, `docs/`, and other repo internals out of the public deploy. Prevents `git clone` from the live URL.
- **`.gitignore`** added (covers OS metadata, editor scratch, env files, `.superpowers/` brainstorming artifacts).

### Documentation produced during the redesign

- **Spec:** `docs/superpowers/specs/2026-05-27-website-redesign-design.md` — locked-in design decisions captured from the brainstorming session before any code was written.
- **Plan:** `docs/superpowers/plans/2026-05-27-website-redesign.md` — 12-task implementation plan with exact code, file paths, and verification commands.

---

## Earlier

Pre-redesign site was a generic blog template with five posts on the homepage. The original repo state is preserved at commit `7b3eab3` ("Initial Load") — useful if you ever need to reference what was there before the redesign.
