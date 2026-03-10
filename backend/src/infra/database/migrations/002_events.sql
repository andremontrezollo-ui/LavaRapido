-- Migration 002: Durable event infrastructure
-- Creates tables for persistent event delivery with at-least-once semantics.

BEGIN;

-- ─────────────────────────────────────────────
-- Events table — persisted domain events
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT        NOT NULL,
  aggregate_id  TEXT        NOT NULL,
  correlation_id TEXT       NOT NULL DEFAULT '',
  causation_id  TEXT        NOT NULL DEFAULT '',
  payload       JSONB       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_event_type    ON events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_aggregate_id  ON events (aggregate_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at    ON events (created_at);

-- ─────────────────────────────────────────────
-- Event deliveries — fan-out to each subscriber
-- SELECT FOR UPDATE SKIP LOCKED enables safe concurrent workers
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_deliveries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  handler_name    TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','delivered','failed','dead_letter')),
  retry_count     INT         NOT NULL DEFAULT 0,
  max_retries     INT         NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, handler_name)
);

CREATE INDEX IF NOT EXISTS idx_event_deliveries_status       ON event_deliveries (status);
CREATE INDEX IF NOT EXISTS idx_event_deliveries_created_at   ON event_deliveries (created_at);

-- ─────────────────────────────────────────────
-- Dead letter queue — failed events after max retries
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  handler_name  TEXT        NOT NULL,
  error         TEXT        NOT NULL,
  retry_count   INT         NOT NULL DEFAULT 0,
  failed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   TEXT
);

CREATE INDEX IF NOT EXISTS idx_dlq_failed_at    ON dead_letter_queue (failed_at);
CREATE INDEX IF NOT EXISTS idx_dlq_resolved_at  ON dead_letter_queue (resolved_at) WHERE resolved_at IS NULL;

-- ─────────────────────────────────────────────
-- Outbox table — transactional outbox pattern
-- Written in same transaction as aggregate changes
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outbox_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT        NOT NULL,
  aggregate_id    TEXT        NOT NULL,
  correlation_id  TEXT        NOT NULL DEFAULT '',
  payload         JSONB       NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','published','failed','dead_letter')),
  retry_count     INT         NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_status      ON outbox_messages (status, created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_created_at  ON outbox_messages (created_at);

-- ─────────────────────────────────────────────
-- Inbox table — idempotent event processing
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inbox_messages (
  event_id      TEXT        NOT NULL,
  event_type    TEXT        NOT NULL,
  handler_name  TEXT        NOT NULL,
  aggregate_id  TEXT        NOT NULL DEFAULT '',
  checksum      TEXT        NOT NULL DEFAULT '',
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, handler_name)
);

CREATE INDEX IF NOT EXISTS idx_inbox_processed_at ON inbox_messages (processed_at);

-- ─────────────────────────────────────────────
-- Idempotency records — prevent duplicate command execution
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idempotency_records (
  key         TEXT        PRIMARY KEY,
  result      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at ON idempotency_records (expires_at);

-- ─────────────────────────────────────────────
-- Saga state — multi-step process coordination
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saga_states (
  saga_id          TEXT        PRIMARY KEY,
  name             TEXT        NOT NULL,
  status           TEXT        NOT NULL
                               CHECK (status IN ('started','step_completed','completed','compensating','compensated','failed')),
  current_step     INT         NOT NULL DEFAULT 0,
  completed_steps  JSONB       NOT NULL DEFAULT '[]',
  failed_step      TEXT,
  error            TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saga_status     ON saga_states (status);
CREATE INDEX IF NOT EXISTS idx_saga_updated_at ON saga_states (updated_at);

-- ─────────────────────────────────────────────
-- Scheduled jobs — durable job queue
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','running','completed','failed','dead_letter')),
  attempts        INT         NOT NULL DEFAULT 0,
  max_attempts    INT         NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error           TEXT,
  scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled ON scheduled_jobs (status, scheduled_for)
  WHERE status = 'pending';

COMMIT;
