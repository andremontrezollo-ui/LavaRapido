-- Events table for durable PostgreSQL EventBus
-- Implements transactional outbox with at-least-once delivery guarantee

CREATE TABLE IF NOT EXISTS events (
  id              TEXT        PRIMARY KEY,
  event_type      TEXT        NOT NULL,
  aggregate_id    TEXT        NOT NULL,
  payload         JSONB       NOT NULL,
  correlation_id  TEXT        NOT NULL DEFAULT '',
  causation_id    TEXT        NOT NULL DEFAULT '',
  source          TEXT        NOT NULL DEFAULT '',
  status          TEXT        NOT NULL DEFAULT 'pending',
  retry_count     INTEGER     NOT NULL DEFAULT 0,
  max_retries     INTEGER     NOT NULL DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the outbox polling query (SELECT FOR UPDATE SKIP LOCKED)
CREATE INDEX IF NOT EXISTS idx_events_pending ON events (created_at ASC)
  WHERE status IN ('pending', 'failed') AND retry_count < max_retries;

-- Index for event type queries
CREATE INDEX IF NOT EXISTS idx_events_type ON events (event_type, created_at DESC);

-- Dead-letter view for observability
CREATE OR REPLACE VIEW events_dead_letter AS
  SELECT * FROM events
  WHERE status = 'dead_letter'
     OR (status = 'failed' AND retry_count >= max_retries)
  ORDER BY last_attempt_at DESC;

-- Backlog view used by health check
CREATE OR REPLACE VIEW events_backlog AS
  SELECT
    status,
    COUNT(*)        AS total,
    MIN(created_at) AS oldest_pending
  FROM events
  GROUP BY status;
