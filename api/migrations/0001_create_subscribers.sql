-- Newsletter subscribers — owned list (Phase 2a: capture).
CREATE TABLE IF NOT EXISTS subscribers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'active',
  consent_at  TEXT NOT NULL,
  source      TEXT,
  unsub_token TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
