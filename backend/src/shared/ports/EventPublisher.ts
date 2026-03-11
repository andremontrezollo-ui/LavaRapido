/**
 * EventPublisher Port
 */

import type { DomainEvent } from '../events/DomainEvent';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
