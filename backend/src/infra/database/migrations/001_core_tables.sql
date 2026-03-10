-- Migration 001: Core infrastructure tables
-- Outbox, Inbox, Idempotency, Saga, Jobs

-- Outbox table for reliable event publishing
CREATE TABLE IF NOT EXISTS outbox_messages (
  id             TEXT        PRIMARY KEY,
  event_type     TEXT        NOT NULL,
  aggregate_id   TEXT        NOT NULL,
  payload        JSONB       NOT NULL,
  correlation_id TEXT        NOT NULL DEFAULT '',
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','published','failed','dead_letter')),
  retry_count    INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ,
  published_at   TIMESTAMPTZ,
  error          TEXT
);

CREATE INDEX IF NOT EXISTS outbox_messages_status_created
  ON outbox_messages (status, created_at)
  WHERE status = 'pending';

-- Inbox table for idempotent event consumption
CREATE TABLE IF NOT EXISTS inbox_messages (
  id            TEXT        PRIMARY KEY,
  event_id      TEXT        NOT NULL,
  handler_name  TEXT        NOT NULL,
  aggregate_id  TEXT        NOT NULL DEFAULT '',
  event_type    TEXT        NOT NULL DEFAULT '',
  checksum      TEXT        NOT NULL DEFAULT '',
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, handler_name)
);

CREATE INDEX IF NOT EXISTS inbox_messages_event_id
  ON inbox_messages (event_id);

-- Idempotency table
CREATE TABLE IF NOT EXISTS idempotency_records (
  key        TEXT        PRIMARY KEY,
  result     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idempotency_records_expires_at
  ON idempotency_records (expires_at);

-- Saga state table
CREATE TABLE IF NOT EXISTS saga_states (
  saga_id         TEXT        PRIMARY KEY,
  name            TEXT        NOT NULL,
  status          TEXT        NOT NULL
                              CHECK (status IN ('started','step_completed','completed','compensating','compensated','failed')),
  current_step    INTEGER     NOT NULL DEFAULT 0,
  completed_steps JSONB       NOT NULL DEFAULT '[]',
  failed_step     TEXT,
  error           TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saga_states_status
  ON saga_states (status)
  WHERE status IN ('started','step_completed','compensating');

-- Job scheduler table
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id              TEXT        PRIMARY KEY,
  name            TEXT        NOT NULL,
  payload         TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','running','completed','failed','dead_letter')),
  attempts        INTEGER     NOT NULL DEFAULT 0,
  max_attempts    INTEGER     NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for   TIMESTAMPTZ NOT NULL,
  locked_until    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS scheduled_jobs_due
  ON scheduled_jobs (scheduled_for, status)
  WHERE status = 'pending';
