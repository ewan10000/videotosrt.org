ALTER TABLE stripe_checkout_attempts ADD COLUMN replay_started INTEGER NOT NULL DEFAULT 0;
