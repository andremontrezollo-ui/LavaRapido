/**
 * Infrastructure Layer — production implementations only.
 * In-memory implementations have been moved to src/test-utils/.
 */

// Database
export { getPool, connectWithRetry, closePool } from './database/connection';
export { TransactionManager } from './database/transaction-manager';

// Persistence — durable Postgres implementations
export { PostgresOutboxStore } from './persistence/postgres-outbox.store';
export { PostgresInboxStore } from './persistence/postgres-inbox.store';
export { PostgresIdempotencyStore } from './persistence/postgres-idempotency.store';

// Locks — Redis-backed distributed lock
export { RedisDistributedLock } from './locks/redis-distributed-lock';

// Messaging
export { OutboxProcessor } from './messaging/outbox-processor';
export { PostgresEventBus } from './messaging/postgres-event-bus';

// Saga
export { SagaOrchestrator } from './saga/saga-orchestrator';
export { PostgresSagaStore } from './saga/postgres-saga.store';
export type { SagaStep, SagaState, SagaStore, SagaStatus } from './saga/saga-orchestrator';

// Scheduler
export { SecureJobScheduler } from './scheduler/job-scheduler';
export { PostgresJobStore } from './scheduler/postgres-job.store';
export type { ScheduledJob, JobStore, JobStatus } from './scheduler/job-scheduler';

// Observability
export { StructuredLogger } from './observability/StructuredLogger';
export { HealthChecker } from './observability/health';
export type { HealthStatus, ComponentHealth } from './observability/health';
export { SecurityHeaders } from './security/SecurityHeaders';
