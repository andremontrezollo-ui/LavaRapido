/**
 * Infrastructure Layer — exports all infra components (durable production implementations).
 */

// Database
export { getPool, query, withClient, closePool } from './database/connection';
export { TransactionManager } from './database/transaction-manager';

// Persistence — PostgreSQL (durable)
export { PostgresOutboxStore } from './persistence/postgres-outbox-store';
export { PostgresInboxStore } from './persistence/postgres-inbox-store';
export { PostgresIdempotencyStore } from './persistence/postgres-idempotency-store';
export { PostgresJobStore } from './persistence/postgres-job-store';
export { PostgresSagaStore } from './persistence/postgres-saga-store';

// Locks — Redis (distributed)
export { RedisDistributedLock } from './locks/redis-distributed-lock';

// Rate Limit — Redis (distributed)
export { RedisRateLimitStore } from './rate-limit/redis-rate-limit-store';

// Messaging — Durable EventBus
export { DurableEventBus } from './messaging/durable-event-bus';

// Messaging — Outbox Processor
export { OutboxProcessor } from './messaging/outbox-processor';

// Saga
export { SagaOrchestrator } from './saga/saga-orchestrator';
export type { SagaStep, SagaState, SagaStore, SagaStatus } from './saga/saga-orchestrator';

// Scheduler
export { SecureJobScheduler } from './scheduler/job-scheduler';
export type { ScheduledJob, JobStore, JobStatus } from './scheduler/job-scheduler';

// Observability
export { StructuredLogger } from './observability/logger';
export { MetricsCollector } from './observability/metrics';
export { HealthCheck } from './observability/health';
export { ReadinessCheck } from './observability/readiness';

// Security
export * from './security/SecurityHeaders';

// In-Memory kept ONLY for tests/dev — NOT used in production flow
export { InMemoryOutboxStore } from './persistence/outbox.store';
export { InMemoryInboxStore } from './persistence/inbox.store';
export { InMemoryIdempotencyStore } from './persistence/idempotency.store';
export { InMemoryDistributedLock } from './locks/distributed-lock';
export { InMemorySagaStore } from './saga/saga.store';
export { InMemoryJobStore } from './scheduler/job.store';

