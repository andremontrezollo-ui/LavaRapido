/**
 * Infrastructure Layer — exports all infra components.
 */

// Database
export { getDbPool, closeDbPool } from './database/connection';
export { TransactionManager } from './database/transaction-manager';

// Persistence (durable)
export { PostgresOutboxStore } from './persistence/postgres-outbox-store';
export { PostgresInboxStore } from './persistence/postgres-inbox-store';
export { PostgresIdempotencyStore } from './persistence/postgres-idempotency-store';

// Locks (durable)
export { RedisDistributedLock } from './locks/redis-distributed-lock';

// Messaging
export { OutboxProcessor } from './messaging/outbox-processor';
export { DurableEventBus } from './messaging/durable-event-bus';

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
