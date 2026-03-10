/**
 * Infrastructure Layer — exports only durable, production-grade implementations.
 * For in-memory test doubles see: backend/src/test-utils/
 */

// Database
export { createPool, getPool } from './database/connection';
export { withTransaction } from './database/transaction-manager';

// Persistence (durable, PostgreSQL-backed)
export { PostgresOutboxStore } from './persistence/postgres-outbox-store';
export { PostgresInboxStore } from './persistence/postgres-inbox-store';
export { PostgresIdempotencyStore } from './persistence/postgres-idempotency-store';

// Locks (durable, Redis-backed)
export { RedisDistributedLock } from './locks/redis-distributed-lock';

// Messaging
export { PostgresEventBus } from './messaging/postgres-event-bus';
export { OutboxProcessor } from './messaging/outbox-processor';

// Saga
export { SagaOrchestrator } from './saga/saga-orchestrator';
export { PostgresSagaStore } from './saga/postgres-saga-store';
export type { SagaStep, SagaState, SagaStore, SagaStatus } from './saga/saga-orchestrator';

// Scheduler
export { SecureJobScheduler } from './scheduler/job-scheduler';
export { PostgresJobStore } from './scheduler/postgres-job-store';
export type { ScheduledJob, JobStore, JobStatus } from './scheduler/job-scheduler';

// Observability
export { StructuredLogger } from './observability/StructuredLogger';
export { SecurityHeaders } from './security/SecurityHeaders';
