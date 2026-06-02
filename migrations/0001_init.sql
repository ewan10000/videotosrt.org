CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_identity
  ON users (provider, provider_id);

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users (email);

CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,
  minutes_used INTEGER NOT NULL DEFAULT 0,
  minutes_limit INTEGER NOT NULL DEFAULT 30,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_records_user_month
  ON usage_records (user_id, month);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
  ON credit_transactions (user_id, created_at);

CREATE TABLE IF NOT EXISTS transcription_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  filename TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  srt_content TEXT,
  duration_seconds INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transcription_jobs_user_created
  ON transcription_jobs (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status
  ON transcription_jobs (status);

CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at TEXT,
  created_at TEXT NOT NULL
);
