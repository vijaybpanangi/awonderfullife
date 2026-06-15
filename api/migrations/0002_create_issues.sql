-- Newsletter issue queue — scheduled weekly send (Phase 2c).
-- An issue is rendered to final HTML/text once at queue time (by the send CLI),
-- with a `{{UNSUB_URL}}` placeholder the scheduled Worker swaps per recipient.
-- The cron handler sends the oldest `queued` issue each Saturday 19:00 ET.
CREATE TABLE IF NOT EXISTS issues (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  subject      TEXT NOT NULL,
  preheader    TEXT,
  html         TEXT NOT NULL,            -- contains the {{UNSUB_URL}} placeholder
  text         TEXT NOT NULL,            -- contains the {{UNSUB_URL}} placeholder
  status       TEXT NOT NULL DEFAULT 'queued', -- queued | sending | sent | failed
  queued_at    TEXT NOT NULL,
  sent_at      TEXT,
  sent_count   INTEGER,
  failed_count INTEGER
);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
