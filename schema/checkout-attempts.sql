-- Apply once to the shared backend/frontend D1 database before either code rollout.
-- Legacy locks intentionally remain unmapped; do not manufacture request bodies.
CREATE TABLE IF NOT EXISTS stripe_checkout_attempts (
 attempt TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 price_id TEXT NOT NULL,
 request_body TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stripe_checkout_attempt_user ON stripe_checkout_attempts(user_id);
