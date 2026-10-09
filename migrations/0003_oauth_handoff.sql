CREATE TABLE IF NOT EXISTS oauth_handoff_claims (
  nonce TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS oauth_handoff_expiry ON oauth_handoff_claims(expires_at);
