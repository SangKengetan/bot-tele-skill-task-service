-- Migration 002: Create tasks table
-- Description: Core task table with status/priority enums, optional scheduling and deadlines.
--              All timestamps stored as TIMESTAMPTZ (UTC internally).

CREATE TABLE IF NOT EXISTS tasks (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(500) NOT NULL,
    description  TEXT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'completed', 'cancelled')),
    priority     VARCHAR(20)  NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    scheduled_at TIMESTAMPTZ,
    deadline_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- User's tasks — most common query pattern
CREATE INDEX IF NOT EXISTS idx_tasks_user_id      ON tasks(user_id);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status);

-- Timeline queries
CREATE INDEX IF NOT EXISTS idx_tasks_deadline_at  ON tasks(deadline_at);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_at ON tasks(scheduled_at);

-- Combined index for user+status queries (e.g., list pending tasks for user)
CREATE INDEX IF NOT EXISTS idx_tasks_user_status  ON tasks(user_id, status);

-- Auto-update updated_at
CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
