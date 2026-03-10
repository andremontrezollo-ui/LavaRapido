-- Migration 002: Durable event bus table

CREATE TABLE IF NOT EXISTS events (
  id             TEXT        PRIMARY KEY,
  event_type     TEXT        NOT NULL,
  aggregate_id   TEXT        NOT NULL DEFAULT '',
  correlation_id TEXT        NOT NULL DEFAULT '',
  payload        JSONB       NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','delivered','failed','dead_letter')),
  retry_count    INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ,
  delivered_at   TIMESTAMPTZ,
  error          TEXT
);

-- Optimised for polling: pick up pending events in FIFO order, skip locked rows
CREATE INDEX IF NOT EXISTS events_pending_fifo
  ON events (created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS events_type_status
  ON events (event_type, status);
