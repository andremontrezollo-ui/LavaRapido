-- Migration: 001_create_outbox_inbox_tables
-- Outbox: transactionally persisted domain events awaiting dispatch
-- Inbox: idempotent record of processed events per handler

CREATE TABLE IF NOT EXISTS outbox_messages (
  id             UUID        PRIMARY KEY,
  event_type     TEXT        NOT NULL,
  aggregate_id   TEXT        NOT NULL,
  payload        JSONB       NOT NULL,
  correlation_id TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','published','failed','dead_letter')),
  retry_count    INTEGER     NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  published_at   TIMESTAMPTZ,
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created
  ON outbox_messages (status, created_at)
  WHERE status IN ('pending','failed');

CREATE TABLE IF NOT EXISTS inbox_messages (
  event_id     TEXT        NOT NULL,
  handler_name TEXT        NOT NULL,
  event_type   TEXT        NOT NULL,
  aggregate_id TEXT        NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checksum     TEXT        NOT NULL DEFAULT '',
  PRIMARY KEY (event_id, handler_name)
);

CREATE INDEX IF NOT EXISTS idx_inbox_processed_at
  ON inbox_messages (processed_at);
