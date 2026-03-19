/**
 * Blockchain Monitor - Infrastructure Layer
 *
 * Adapters, repositories, and mappers implementing application ports.
 */

import type { BlockchainEventPublisher } from '../application';
import type { DomainEvent } from '../../../shared/events/domain-event';

// Re-export concrete implementations from sub-modules
export { MockBlockchainSource } from './adapters/mock-blockchain-source.adapter';
export { BlockchainEventNormalizer } from './adapters/blockchain-event-normalizer.adapter';
export { InMemoryObservedTransactionRepository } from './repositories/observed-transaction.repository';
export { ObservedTransactionMapper } from './mappers/observed-transaction.mapper';
export type { ObservedTransactionRecord } from './mappers/observed-transaction.mapper';

// In-Memory Event Publisher for Development
export class InMemoryBlockchainEventPublisher implements BlockchainEventPublisher {
  private events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }

  getEvents(): readonly DomainEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
