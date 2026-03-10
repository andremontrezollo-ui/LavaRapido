/**
 * EventPublisher Port — shared interface for emitting domain events.
 */

import type { DomainEvent } from '../events/DomainEvent';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
