# Newsletter issues

Write each newsletter issue as a Markdown file in this folder, then send it to the
owned subscriber list (D1) via Resend with the `send` script.

## Write an issue

Copy `2026-06-20-example.md` to a new dated file (e.g. `2026-07-01-summer-notes.md`):

```markdown
---
subject: Your subject line
preheader: Optional inbox preview line
---

Your issue body in **Markdown**.
```

## Send

From the `api/` directory:

```bash
# 1. Preview to yourself first (fully offline with --dry-run; or a real test email)
npm run send -- issues/<file>.md --dry-run --test you@example.com   # writes issues/.preview.html, sends nothing
npm run send -- issues/<file>.md --test you@example.com             # sends ONLY to you (needs RESEND_API_KEY)

# 2. Broadcast to all active subscribers
npm run send -- issues/<file>.md
```

- `--dry-run` resolves recipients and writes `issues/.preview.html` (open in a browser) but sends nothing.
- `--test <email>` sends to that single address only (no D1 lookup).
- With neither flag, it reads `status='active'` subscribers from D1 (via `wrangler`) and sends one personalized email each, with a per‑subscriber unsubscribe link + `List-Unsubscribe` header.

## Prerequisites (one‑time, owner)

1. **Resend account** → create an API key.
2. **Verify the sending domain** in Resend: add `send.awonderfullife.ca`, then add the SPF/DKIM/DMARC records Resend shows into **Cloudflare DNS** (DNS‑only) and click Verify. (A subdomain keeps the apex iCloud mailbox untouched.)
3. **Local env** (never commit) — set before sending:
   ```bash
   export RESEND_API_KEY="re_..."
   export NEWSLETTER_FROM="A Wonderful Life <hello@send.awonderfullife.ca>"
   ```
   (`NEWSLETTER_FROM` defaults to `hello@send.awonderfullife.ca` if unset.)

Sending happens **locally** (this CLI), not in the Worker — the Worker only handles signups/unsubscribes.
