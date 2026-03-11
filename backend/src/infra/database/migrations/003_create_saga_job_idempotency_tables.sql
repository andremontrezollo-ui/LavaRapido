-- Migration: 003_create_saga_job_idempotency_tables
-- sagas: tracks multi-step distributed process state
-- scheduled_jobs: persistent job queue with locking
-- idempotency_records: request-level idempotency keys

CREATE TABLE IF NOT EXISTS sagas (
  saga_id         UUID        PRIMARY KEY,
  name            TEXT        NOT NULL,
  status          TEXT        NOT NULL
                              CHECK (status IN ('started','step_completed','completed','compensating','compensated','failed')),
  current_step    INTEGER     NOT NULL DEFAULT 0,
  completed_steps JSONB       NOT NULL DEFAULT '[]',
  failed_step     TEXT,
  error           TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sagas_status
  ON sagas (status)
  WHERE status IN ('started','step_completed','compensating');

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id              UUID        PRIMARY KEY,
  name            TEXT        NOT NULL,
  payload         JSONB       NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','running','completed','failed','dead_letter')),
  attempts        INTEGER     NOT NULL DEFAULT 0,
  max_attempts    INTEGER     NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_due
  ON scheduled_jobs (scheduled_for, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_jobs_locked
  ON scheduled_jobs (locked_until)
  WHERE status = 'running';

CREATE TABLE IF NOT EXISTS idempotency_records (
  key          TEXT        PRIMARY KEY,
  response     JSONB       NOT NULL,
  status_code  INTEGER     NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires
  ON idempotency_records (expires_at);
