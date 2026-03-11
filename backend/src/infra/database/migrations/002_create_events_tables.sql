-- Migration: 002_create_events_tables
-- events: canonical event log
-- event_deliveries: tracking delivery per subscriber
-- dead_letter_queue: permanently failed events

CREATE TABLE IF NOT EXISTS events (
  id           UUID        PRIMARY KEY,
  event_type   TEXT        NOT NULL,
  aggregate_id TEXT        NOT NULL,
  payload      JSONB       NOT NULL,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type_occurred
  ON events (event_type, occurred_at);

CREATE INDEX IF NOT EXISTS idx_events_aggregate
  ON events (aggregate_id);

CREATE TABLE IF NOT EXISTS event_deliveries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID        NOT NULL REFERENCES events(id),
  subscriber   TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','delivered','failed','dead_letter')),
  retry_count  INTEGER     NOT NULL DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, subscriber)
);

CREATE INDEX IF NOT EXISTS idx_event_deliveries_status
  ON event_deliveries (status, created_at)
  WHERE status IN ('pending','failed');

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT        NOT NULL,
  aggregate_id TEXT        NOT NULL,
  payload      JSONB       NOT NULL,
  subscriber   TEXT        NOT NULL,
  error        TEXT        NOT NULL,
  failed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  retry_count  INTEGER     NOT NULL DEFAULT 0,
  resolved     BOOLEAN     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_dlq_unresolved
  ON dead_letter_queue (failed_at)
  WHERE resolved = false;
