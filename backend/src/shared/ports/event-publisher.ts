/**
 * EventPublisher Port
 *
 * Minimal port for publishing domain events from application use cases.
 * Satisfied by EventBus or any adapter that can publish SystemEvents.
 */

import type { SystemEvent } from '../events/DomainEvent';

export interface EventPublisher {
  publish(event: SystemEvent): Promise<void>;
}
