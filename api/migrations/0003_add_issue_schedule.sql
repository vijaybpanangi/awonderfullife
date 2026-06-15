-- Per-issue scheduling (Phase 2d): each issue carries its own target send time
-- (UTC ISO). The cron tick sends issues whose scheduled_at has arrived. Replaces
-- the implicit "everything goes next Saturday" model with explicit per-issue times
-- (the default is still next Saturday 7pm ET, computed at queue time).
ALTER TABLE issues ADD COLUMN scheduled_at TEXT;
CREATE INDEX IF NOT EXISTS idx_issues_due ON issues(status, scheduled_at);
