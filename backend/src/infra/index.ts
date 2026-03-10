/**
 * Infrastructure Layer — exports all infra components.
 */

// Persistence
export { InMemoryOutboxStore } from './persistence/outbox.store';
export { InMemoryInboxStore } from './persistence/inbox.store';
export { InMemoryIdempotencyStore } from './persistence/idempotency.store';

// Repositories
export { IdempotencyKeyRepository } from './repositories/idempotency-key-repository';
export type { DbClient as IdempotencyDbClient } from './repositories/idempotency-key-repository';
export { ProcessedMessageRepository } from './repositories/processed-message-repository';
export type { ProcessedMessage, ProcessedMessageStore } from './repositories/processed-message-repository';

// Locks
export { InMemoryDistributedLock } from './locks/distributed-lock';

// Messaging
export { OutboxProcessor } from './messaging/outbox-processor';

// Saga
export { SagaOrchestrator } from './saga/saga-orchestrator';
export { InMemorySagaStore } from './saga/saga.store';
export { PostgresSagaStore } from './saga/postgres-saga-store';
export type { SagaStep, SagaState, SagaStore, SagaStatus } from './saga/saga-orchestrator';

// Scheduler
export { SecureJobScheduler } from './scheduler/job-scheduler';
export { InMemoryJobStore } from './scheduler/job.store';
export type { ScheduledJob, JobStore, JobStatus } from './scheduler/job-scheduler';

// Observability
export { StructuredLogger } from './observability/StructuredLogger';
export { SecurityHeaders } from './security/SecurityHeaders';
