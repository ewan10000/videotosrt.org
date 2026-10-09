-- Apply to the SAME D1 database used by api.videotosrt.org, after backup.
-- Existing backend users, usage_records and credit_transactions tables are prerequisites.
CREATE TABLE IF NOT EXISTS stripe_accounts (
 user_id TEXT PRIMARY KEY REFERENCES users(id),
 customer_id TEXT NOT NULL UNIQUE,
 subscription_id TEXT UNIQUE,
 status TEXT NOT NULL DEFAULT 'none',
 event_created INTEGER NOT NULL DEFAULT 0,
 mutation_token TEXT NOT NULL DEFAULT '',
 paid_through INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS vts_stripe_checkouts (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 price_id TEXT NOT NULL,
 mode TEXT NOT NULL,
 attempt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stripe_checkout_locks (
 user_id TEXT PRIMARY KEY REFERENCES users(id),
 attempt TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS vts_stripe_events (
 id TEXT PRIMARY KEY,
 token TEXT NOT NULL,
 created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS stripe_quota_bases (
 user_id TEXT NOT NULL REFERENCES users(id),
 month TEXT NOT NULL,
 plan_minutes INTEGER NOT NULL,
 PRIMARY KEY (user_id, month)
);
