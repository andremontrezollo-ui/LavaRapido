/**
 * EventPublisher Port for blockchain-monitor
 */

import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface BlockchainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
