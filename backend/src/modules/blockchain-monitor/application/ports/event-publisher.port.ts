/**
 * EventPublisher Port for blockchain-monitor
 */

import type { DomainEvent } from '../../../../shared/events/domain-event';

export interface BlockchainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
