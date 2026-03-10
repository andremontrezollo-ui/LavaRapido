/**
 * Blockchain Monitor - Infrastructure Layer
 * 
 * Adapters for data sources and simulators.
 * Implements ports defined in application layer.
 */

import type { BlockchainSource, BlockchainEventPublisher } from '../application';
import type { BlockchainEventDto } from '../application/dtos/blockchain-event.dto';
import type { DomainEvent } from '../../../shared/events/DomainEvent';

// Simulated/Mock Data Source for Development
export class SimulatedBlockchainDataSource implements BlockchainSource {
  private currentHeight = 800000;
  private transactions = new Map<string, number>();

  async poll(): Promise<BlockchainEventDto[]> {
    return [];
  }

  async getCurrentBlockHeight(): Promise<number> {
    return this.currentHeight;
  }

  async getTransactionConfirmations(txId: string): Promise<number | null> {
    return this.transactions.get(txId) ?? null;
  }

  // Test helpers
  simulateNewBlock(): void {
    this.currentHeight++;
    for (const [hash, confirmations] of this.transactions) {
      this.transactions.set(hash, confirmations + 1);
    }
  }

  addTransaction(hash: string, confirmations = 0): void {
    this.transactions.set(hash, confirmations);
  }
}

// In-Memory Event Publisher for Development
export class InMemoryBlockchainEventPublisher implements BlockchainEventPublisher {
  private published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }

  getPublished(): readonly DomainEvent[] {
    return [...this.published];
  }

  clear(): void {
    this.published = [];
  }
}
