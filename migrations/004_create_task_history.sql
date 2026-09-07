-- Migration 004: Create task_history table
-- Description: Audit trail for all task state changes.
--              old_value and new_value are JSONB for flexible schema.
--
-- Actions:
--   created         — task was created
--   updated         — task fields were modified
--   completed       — task marked as complete
--   reopened        — task moved back to pending
--   cancelled       — task was cancelled
--   deleted         — task was deleted (recorded before hard delete)
--   deadline_changed — deadline_at was modified
--   reminder_created — a reminder was added to the task

CREATE TABLE IF NOT EXISTS task_history (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action     VARCHAR(50) NOT NULL,
    old_value  JSONB,
    new_value  JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup history by task (most common: "show me what changed on this task")
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);

-- Lookup all actions by user (for audit logs)
CREATE INDEX IF NOT EXISTS idx_task_history_user_id ON task_history(user_id);
