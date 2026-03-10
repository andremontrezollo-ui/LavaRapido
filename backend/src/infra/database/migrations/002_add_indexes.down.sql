-- Migration 002: Add Indexes — Rollback

DROP INDEX IF EXISTS idx_sagas_updated_at;
DROP INDEX IF EXISTS idx_sagas_status;
DROP INDEX IF EXISTS idx_scheduled_jobs_status_scheduled_for;
DROP INDEX IF EXISTS idx_idempotency_expires_at;
DROP INDEX IF EXISTS idx_inbox_messages_event_id;
DROP INDEX IF EXISTS idx_outbox_messages_aggregate_id;
DROP INDEX IF EXISTS idx_outbox_messages_status_created;
