/**
 * Infrastructure Layer — production exports only.
 *
 * IMPORTANT: InMemory* implementations are NOT exported from here.
 * They live in src/test-utils/ and are only for tests.
 * The production composition root (bootstrap/production-container.ts)
 * imports them directly and will swap them for durable stores when ready.
 */

// Messaging
export { OutboxProcessor } from './messaging/outbox-processor';

// Saga
export { SagaOrchestrator } from './saga/saga-orchestrator';
export type { SagaStep, SagaState, SagaStore, SagaStatus } from './saga/saga-orchestrator';

// Scheduler
export { SecureJobScheduler } from './scheduler/job-scheduler';
export type { ScheduledJob, JobStore, JobStatus } from './scheduler/job-scheduler';

// Observability
export { StructuredLogger } from './observability/StructuredLogger';
export { SECURITY_HEADERS, getResponseHeaders, getCorsHeaders } from './security/SecurityHeaders';
