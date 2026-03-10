-- Migration 001: Initial Schema
-- Creates core tables for the LavaRapido backend.
-- Run: psql $DATABASE_URL -f 001_initial_schema.up.sql

-- Outbox messages (transactional outbox pattern)
CREATE TABLE IF NOT EXISTS outbox_messages (
    id              UUID PRIMARY KEY,
    event_type      TEXT NOT NULL,
    aggregate_id    TEXT NOT NULL,
    payload         JSONB NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'published', 'failed', 'dead_letter')),
    retry_count     INTEGER NOT NULL DEFAULT 0,
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ
);

-- Inbox messages (deduplication for incoming events)
CREATE TABLE IF NOT EXISTS inbox_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     TEXT NOT NULL,
    event_type   TEXT NOT NULL,
    handler_name TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, handler_name)
);

-- Idempotency records
CREATE TABLE IF NOT EXISTS idempotency_records (
    key          TEXT PRIMARY KEY,
    result       JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL
);

-- Scheduled jobs
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id              UUID PRIMARY KEY,
    name            TEXT NOT NULL,
    payload         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'dead_letter')),
    attempts        INTEGER NOT NULL DEFAULT 0,
    max_attempts    INTEGER NOT NULL DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    locked_until    TIMESTAMPTZ,
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_for   TIMESTAMPTZ NOT NULL
);

-- Sagas
CREATE TABLE IF NOT EXISTS sagas (
    saga_id          UUID PRIMARY KEY,
    status           TEXT NOT NULL
                     CHECK (status IN ('started','step_completed','compensating','completed','failed')),
    current_step     INTEGER NOT NULL DEFAULT 0,
    completed_steps  JSONB NOT NULL DEFAULT '[]',
    payload          JSONB,
    error            TEXT,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
