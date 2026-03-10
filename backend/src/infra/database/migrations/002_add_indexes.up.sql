-- Migration 002: Add Indexes for Performance
-- Improves query performance on hot paths.

-- Outbox: fast lookup of pending messages
CREATE INDEX IF NOT EXISTS idx_outbox_messages_status_created
    ON outbox_messages (status, created_at)
    WHERE status IN ('pending', 'failed');

-- Outbox: aggregate-level queries
CREATE INDEX IF NOT EXISTS idx_outbox_messages_aggregate_id
    ON outbox_messages (aggregate_id);

-- Inbox: deduplication lookup by event_id
CREATE INDEX IF NOT EXISTS idx_inbox_messages_event_id
    ON inbox_messages (event_id);

-- Idempotency: prune expired records
CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at
    ON idempotency_records (expires_at);

-- Scheduled jobs: fast lookup of due jobs
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_scheduled_for
    ON scheduled_jobs (status, scheduled_for)
    WHERE status = 'pending';

-- Sagas: fast lookup of active sagas
CREATE INDEX IF NOT EXISTS idx_sagas_status
    ON sagas (status)
    WHERE status IN ('started', 'step_completed', 'compensating');

-- Sagas: updated_at for stuck saga detection
CREATE INDEX IF NOT EXISTS idx_sagas_updated_at
    ON sagas (updated_at)
    WHERE status IN ('started', 'step_completed', 'compensating');
