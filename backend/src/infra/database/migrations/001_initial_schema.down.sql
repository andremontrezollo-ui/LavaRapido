-- Migration 001: Initial Schema — Rollback
-- Drops all tables created by 001_initial_schema.up.sql

DROP TABLE IF EXISTS sagas;
DROP TABLE IF EXISTS scheduled_jobs;
DROP TABLE IF EXISTS idempotency_records;
DROP TABLE IF EXISTS inbox_messages;
DROP TABLE IF EXISTS outbox_messages;
