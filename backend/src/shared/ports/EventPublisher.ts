/**
 * EventPublisher Port — minimal interface for publishing domain events.
 * Modules depend on this port, not on the concrete EventBus implementation.
 * This prevents direct coupling between domain modules and infrastructure.
 */

import type { SystemEvent } from '../events/DomainEvent';

export interface EventPublisher {
  publish(event: SystemEvent): Promise<void>;
}
