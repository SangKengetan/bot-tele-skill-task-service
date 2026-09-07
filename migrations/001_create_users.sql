-- Migration 001: Create users table
-- Description: Core user table. telegram_user_id is the unique identifier from Telegram.
--              Supports multiple timezones (WITA/WIB/WIT).

CREATE TABLE IF NOT EXISTS users (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_user_id VARCHAR(50)  NOT NULL UNIQUE,
    display_name     VARCHAR(255) NOT NULL,
    timezone         VARCHAR(100) NOT NULL DEFAULT 'Asia/Makassar',
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by telegram_user_id (used in every auth flow)
CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON users(telegram_user_id);

-- Trigger to auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
