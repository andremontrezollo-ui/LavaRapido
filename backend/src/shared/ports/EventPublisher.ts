/**
 * EventPublisher Port - Abstraction for publishing domain events
 */

import type { DomainEvent } from '../events/DomainEvent';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
