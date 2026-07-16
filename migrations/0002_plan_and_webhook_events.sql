CREATE TABLE IF NOT EXISTS creem_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at TEXT,
  created_at TEXT NOT NULL
);

-- D1/SQLite does not support ADD COLUMN IF NOT EXISTS. Do not place
-- unconditional ALTER TABLE statements here because production databases may
-- already have users.plan from the frontend schema. For legacy backend-only
-- databases missing users.plan, run a one-time preflight after checking
-- PRAGMA table_info(users):
--   ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
--   ALTER TABLE users ADD COLUMN extra_credit_hours REAL NOT NULL DEFAULT 0;
--   ALTER TABLE users ADD COLUMN last_login_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;
