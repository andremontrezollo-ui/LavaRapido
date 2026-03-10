-- Initial schema for LavaRapido durable infrastructure
-- Creates tables required for: outbox, inbox, saga state, idempotency, and job scheduling

-- Outbox messages: events staged for reliable publishing
CREATE TABLE IF NOT EXISTS outbox_messages (
  id             TEXT        PRIMARY KEY,
  event_type     TEXT        NOT NULL,
  aggregate_id   TEXT        NOT NULL,
  payload        TEXT        NOT NULL,
  correlation_id TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending',
  retry_count    INTEGER     NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  published_at   TIMESTAMP WITH TIME ZONE,
  error          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_messages (status, created_at)
  WHERE status = 'pending';

-- Inbox messages: deduplication record for processed events
CREATE TABLE IF NOT EXISTS inbox_messages (
  event_id     TEXT NOT NULL,
  handler_name TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  checksum     TEXT NOT NULL DEFAULT '',
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (event_id, handler_name)
);

CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON inbox_messages (event_id);

-- Saga state: persistent saga orchestration state for crash recovery
CREATE TABLE IF NOT EXISTS saga_state (
  saga_id         TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL,
  current_step    INTEGER NOT NULL DEFAULT 0,
  completed_steps JSONB   NOT NULL DEFAULT '[]',
  failed_step     TEXT,
  error           TEXT,
  started_at      TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saga_state_status ON saga_state (status)
  WHERE status IN ('started', 'step_completed', 'compensating');

-- Idempotency keys: prevent duplicate command/event processing
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key        TEXT PRIMARY KEY,
  result     TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys (expires_at);

-- Jobs: scheduled work items with distributed locking
CREATE TABLE IF NOT EXISTS jobs (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  payload         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  completed_at    TIMESTAMP WITH TIME ZONE,
  error           TEXT,
  scheduled_for   TIMESTAMP WITH TIME ZONE NOT NULL,
  locked_until    TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_due ON jobs (scheduled_for, status)
  WHERE status = 'pending';
