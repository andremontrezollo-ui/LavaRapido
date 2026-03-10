/**
 * Infrastructure Layer — exports all production infra components.
 * InMemory* implementations are intentionally excluded; use backend/src/test-utils/ in tests.
 */

// Database
export { createPool, getPool, closePool, checkConnection } from './database/connection';
export type { DatabaseConfig } from './database/connection';
export { runMigrations } from './database/migrate';

// Persistence (production — PostgreSQL-backed)
export { PostgresOutboxStore } from './persistence/postgres-outbox.store';
export { PostgresInboxStore } from './persistence/postgres-inbox.store';
export { PostgresIdempotencyStore } from './persistence/postgres-idempotency.store';
export { PostgresSagaStore } from './persistence/postgres-saga.store';
export { PostgresJobStore } from './persistence/postgres-job.store';

// Locks (production — Redis-backed)
export { RedisDistributedLock } from './locks/redis-distributed-lock';

// Messaging
export { OutboxProcessor } from './messaging/outbox-processor';
export { PostgresEventBus } from './messaging/postgres-event-bus';

// Saga
export { SagaOrchestrator } from './saga/saga-orchestrator';
export type { SagaStep, SagaState, SagaStore, SagaStatus } from './saga/saga-orchestrator';

// Scheduler
export { SecureJobScheduler } from './scheduler/job-scheduler';
export type { ScheduledJob, JobStore, JobStatus } from './scheduler/job-scheduler';

// Observability
export { StructuredLogger } from './observability/StructuredLogger';
export { SecurityHeaders } from './security/SecurityHeaders';
