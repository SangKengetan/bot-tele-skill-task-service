-- Migration 003: Create reminders table
-- Description: Reminder records linked to tasks. The scheduler queries this table
--              every REMINDER_INTERVAL_SECONDS to find due reminders.
--
-- IMPORTANT: The scheduler uses UPDATE...RETURNING to atomically claim reminders
--            and prevent double-processing.

CREATE TABLE IF NOT EXISTS reminders (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id   UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remind_at TIMESTAMPTZ NOT NULL,
    status    VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
    sent_at   TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scheduler query: SELECT WHERE status = 'pending' AND remind_at <= NOW()
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_status    ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id   ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_task_id   ON reminders(task_id);

-- Partial index optimizes the most critical scheduler query
-- Only indexes rows that are still pending (reduces index size significantly over time)
CREATE INDEX IF NOT EXISTS idx_reminders_pending_due
    ON reminders(remind_at)
    WHERE status = 'pending';
