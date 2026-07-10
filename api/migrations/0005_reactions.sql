-- Per-post "appreciate" reactions (Phase 4, zero-PII). No accounts, no stored IPs:
-- `reaction_events` tracks a same-day abuse throttle keyed by a salted, non-reversible
-- hash of (day, IP) — see REACTION_SALT in .dev.vars.example — the raw IP is never
-- stored. `day` is a plain YYYY-MM-DD marker (no PII) used only so the 15-min cron
-- sweep can purge yesterday-and-older event rows.
CREATE TABLE IF NOT EXISTS reactions (
  slug       TEXT PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reaction_events (
  day_hash TEXT NOT NULL,             -- SHA-256(REACTION_SALT:day:CF-Connecting-IP), hex
  slug     TEXT NOT NULL,
  hits     INTEGER NOT NULL DEFAULT 1,
  day      TEXT NOT NULL,             -- plain YYYY-MM-DD (UTC) — purge key only, no PII
  PRIMARY KEY (day_hash, slug)
);
