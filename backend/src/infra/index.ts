/**
 * Infrastructure Layer — exports all infra components.
 * Production implementations use PostgreSQL and Redis.
 * In-memory variants remain available for testing only.
 */

// Persistence — In-Memory (tests only)
export { InMemoryOutboxStore } from './persistence/outbox.store';
export { InMemoryInboxStore } from './persistence/inbox.store';
export { InMemoryIdempotencyStore } from './persistence/idempotency.store';

// Persistence — PostgreSQL (production)
export { PostgresOutboxStore } from './persistence/postgres-outbox-store';
export { PostgresInboxStore } from './persistence/postgres-inbox-store';
export { PostgresIdempotencyStore } from './persistence/postgres-idempotency-store';

// Locks — In-Memory (tests only)
export { InMemoryDistributedLock } from './locks/distributed-lock';

// Locks — Redis (production)
export { RedisDistributedLock } from './locks/redis-distributed-lock';

// Messaging
export { OutboxProcessor } from './messaging/outbox-processor';
export { PostgresEventBus } from './messaging/postgres-event-bus';

// Saga
export { SagaOrchestrator } from './saga/saga-orchestrator';
export { InMemorySagaStore } from './saga/saga.store';
export { PostgresSagaStore } from './saga/postgres-saga-store';
export type { SagaStep, SagaState, SagaStore, SagaStatus } from './saga/saga-orchestrator';

// Scheduler
export { SecureJobScheduler } from './scheduler/job-scheduler';
export { InMemoryJobStore } from './scheduler/job.store';
export { PostgresJobStore } from './scheduler/postgres-job-store';
export type { ScheduledJob, JobStore, JobStatus } from './scheduler/job-scheduler';

// Database
export { getPool, checkDatabaseConnection, closePool } from './database/connection';
export { TransactionManager } from './database/transaction-manager';

// Observability
export { InfrastructureHealthChecker } from './observability/health';
export type { ReadinessReport, ComponentCheck } from './observability/health';
export { StructuredLogger } from './observability/StructuredLogger';
export { SECURITY_HEADERS, CORS_HEADERS, getResponseHeaders, getCorsHeaders } from './security/SecurityHeaders';

// Rate Limiting
export { RedisRateLimitStore } from './rate-limit/redis-rate-limit-store';
