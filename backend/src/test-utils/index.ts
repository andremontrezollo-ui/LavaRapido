/**
 * Test Utilities — InMemory* implementations for use in tests ONLY.
 *
 * NEVER import this module from production code.
 * These implementations exist solely to support unit and integration tests
 * without requiring live infrastructure.
 */

export { InMemoryOutboxStore } from '../infra/persistence/outbox.store';
export { InMemoryInboxStore } from '../infra/persistence/inbox.store';
export { InMemoryIdempotencyStore } from '../infra/persistence/idempotency.store';
export { InMemoryDistributedLock } from '../infra/locks/distributed-lock';
export { InMemoryJobStore } from '../infra/scheduler/job.store';
export { InMemorySagaStore } from '../infra/saga/saga.store';
export { ResilientEventBus } from '../shared/events/InMemoryEventBus';
