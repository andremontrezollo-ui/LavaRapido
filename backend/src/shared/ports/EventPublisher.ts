/**
 * EventPublisher Port — abstraction for publishing domain events.
 */

import type { SystemEvent } from '../events/DomainEvent';

export interface EventPublisher {
  publish(event: SystemEvent): Promise<void>;
  publishAll(events: SystemEvent[]): Promise<void>;
}
