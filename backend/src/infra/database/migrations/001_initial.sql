-- Initial schema migration
-- Creates the core application tables

CREATE TABLE IF NOT EXISTS outbox_messages (
  id            TEXT        PRIMARY KEY,
  event_type    TEXT        NOT NULL,
  aggregate_id  TEXT        NOT NULL,
  payload       JSONB       NOT NULL,
  correlation_id TEXT       NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending',
  retry_count   INTEGER     NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  published_at  TIMESTAMPTZ,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_messages (status, created_at)
  WHERE status IN ('pending', 'failed');

CREATE TABLE IF NOT EXISTS inbox_messages (
  event_id     TEXT        NOT NULL,
  event_type   TEXT        NOT NULL,
  handler_name TEXT        NOT NULL,
  aggregate_id TEXT        NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum     TEXT        NOT NULL DEFAULT '',
  PRIMARY KEY (event_id, handler_name)
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  key         TEXT        PRIMARY KEY,
  result      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_records (expires_at);

CREATE TABLE IF NOT EXISTS saga_states (
  saga_id         TEXT        PRIMARY KEY,
  name            TEXT        NOT NULL,
  status          TEXT        NOT NULL,
  current_step    INTEGER     NOT NULL DEFAULT 0,
  completed_steps JSONB       NOT NULL DEFAULT '[]',
  failed_step     TEXT,
  error           TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saga_status ON saga_states (status)
  WHERE status IN ('started', 'step_completed', 'compensating');

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id              TEXT        PRIMARY KEY,
  name            TEXT        NOT NULL,
  payload         TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending',
  attempts        INTEGER     NOT NULL DEFAULT 0,
  max_attempts    INTEGER     NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for   TIMESTAMPTZ NOT NULL,
  locked_until    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_due ON scheduled_jobs (scheduled_for, status)
  WHERE status = 'pending';
