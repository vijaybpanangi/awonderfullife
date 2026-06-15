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

> **Prefer a UI?** There's a login-protected web editor at **`https://api.awonderfullife.ca/admin/compose`** (behind Cloudflare Access) — a rich editor, live preview, send-a-test-to-yourself, schedule picker, and queue management, all without the terminal. This CLI remains the power-user path and does exactly the same things.

There are two ways to send: **scheduled** (the normal path — it goes out automatically) and **immediate** (send right now from your laptop).

### Scheduled — queue with a send time (recommended)

Each issue carries **its own send time**. Queue it any time; a 15-minute cron tick sends it when its time arrives. Default is **next Saturday 7pm Eastern**; pass `--at` for a custom Eastern-Time time:

```bash
npm run send -- issues/<file>.md --dry-run            # preview it first (writes issues/.preview.html, sends nothing)
npm run send -- issues/<file>.md --queue              # queue for the next Saturday 7pm ET
npm run send -- issues/<file>.md --queue --at "2026-07-11 09:00"   # custom time (Eastern)
npm run send -- --queue-list                          # see each issue's scheduled time / sent status
npm run send -- --unqueue <id>                        # pull a queued issue back out
```

- The cron sends each issue at **its own `scheduled_at`** (oldest-due first), then marks it `sent`.
- **Each issue sends at its own time** — two issues both left on the default both go that Saturday; give them different `--at` times to space them out.
- **Nothing due → nothing sends.** No empty or filler emails, ever.
- Queuing renders the issue once and stores it in D1 (with a `{{UNSUB_URL}}` placeholder the Worker fills per subscriber). Editing the `.md` file afterward has no effect — `--unqueue` and re-`--queue` to change a pending issue.
- DST is handled automatically: 7pm ET (or any ET time you pick) stays correct in both summer and winter.

### Immediate — send right now (test or one-off)

From the `api/` directory, with `RESEND_API_KEY` exported locally:

```bash
npm run send -- issues/<file>.md --test you@example.com   # sends ONLY to you (no D1 lookup)
npm run send -- issues/<file>.md                          # broadcast to all active subscribers NOW
```

- `--dry-run` resolves recipients and writes `issues/.preview.html` (open in a browser) but sends nothing.
- `--test <email>` sends to that single address only.
- With neither flag, it reads `status='active'` subscribers from D1 (via `wrangler`) and sends one personalized email each, with a per‑subscriber unsubscribe link + `List-Unsubscribe` header.

## Prerequisites (one‑time, owner)

1. **Resend account** → create an API key.
2. **Verify the sending domain** in Resend: add `send.awonderfullife.ca`, then add the SPF/DKIM/DMARC records Resend shows into **Cloudflare DNS** (DNS‑only) and click Verify. (A subdomain keeps the apex iCloud mailbox untouched.)
3. **Local env** (never commit) — set before sending:
   ```bash
   export RESEND_API_KEY="re_..."
   export NEWSLETTER_FROM="A Wonderful Life <hello@send.awonderfullife.ca>"
   export NEWSLETTER_REPLY_TO="v@awonderfullife.ca"
   ```
   (`NEWSLETTER_FROM` defaults to `hello@send.awonderfullife.ca` and `NEWSLETTER_REPLY_TO` to `v@awonderfullife.ca` if unset — so replies to an issue reach the real iCloud inbox, since the `send.` subdomain is send‑only.)

**Immediate** sends happen locally (this CLI). **Scheduled** sends happen in the Worker's weekly cron — so those use a server-side key, not your laptop's.

## Enabling the scheduled send (one-time, owner)

The queue/CLI works as soon as the `issues` table exists, but the **automatic Saturday send** needs the Worker deployed with its key:

1. **Apply the migration** (creates the `issues` table in D1):
   ```bash
   npx wrangler d1 execute awonderfullife-api --remote --file migrations/0002_create_issues.sql
   ```
2. **Set the Resend key as a Worker secret** (this is what the cron uses — separate from your local env var):
   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```
3. **Deploy the Worker** (activates the cron triggers):
   ```bash
   npm run deploy
   ```

Until the secret is set, the cron runs but safely no-ops (`skipped_no_key`) — it never sends without a key. `NEWSLETTER_FROM` and `NEWSLETTER_REPLY_TO` are non-secret `vars` in `wrangler.jsonc`.
