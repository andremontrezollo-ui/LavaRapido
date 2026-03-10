/**
 * DependencyContainer — interface defining all production services
 * that must be resolved before the application starts.
 */

import type { ReadinessResult } from './types';
import type { EventBus } from '../shared/events/EventBus';
import type { OutboxStore } from '../shared/events/outbox-message';
import type { InboxStore } from '../shared/events/inbox-message';
import type { DistributedLock } from '../shared/ports/DistributedLock';
import type { JobStore } from '../infra/scheduler/job-scheduler';

export interface DependencyContainer {
  readonly eventBus: EventBus;
  readonly outboxStore: OutboxStore;
  readonly inboxStore: InboxStore;
  readonly lock: DistributedLock;
  readonly jobStore: JobStore;
  readinessCheck(): Promise<ReadinessResult>;
  dispose(): Promise<void>;
}
