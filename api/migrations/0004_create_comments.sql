-- Post comments (Phase 3). Comments publish immediately once the author verifies
-- their email (magic link), then a moderation sweep may tombstone failures in place.
CREATE TABLE IF NOT EXISTS comments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL,              -- post slug (no .html)
  name         TEXT NOT NULL,              -- shown publicly
  email        TEXT NOT NULL,              -- for verification only; never shown
  body         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'unverified', -- unverified | visible | removed
  mod_reason   TEXT,                       -- why a sweep removed it (shown as tombstone hint)
  created_at   TEXT NOT NULL,
  verified_at  TEXT,
  moderated_at TEXT                        -- set once the sweep has checked it
);
CREATE INDEX IF NOT EXISTS idx_comments_slug_status ON comments(slug, status);
CREATE INDEX IF NOT EXISTS idx_comments_unmoderated ON comments(status, moderated_at);

-- One-time magic-link tokens that verify an email and publish its pending comment.
CREATE TABLE IF NOT EXISTS comment_verifications (
  token       TEXT PRIMARY KEY,
  comment_id  INTEGER NOT NULL,
  email       TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
