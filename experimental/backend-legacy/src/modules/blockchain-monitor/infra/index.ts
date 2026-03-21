/**
 * Blockchain Monitor - Infrastructure Layer
 * 
 * Adapters for data sources and simulators.
 * Implements ports defined in application layer.
 */

import type { BlockchainDataSource, EventPublisher } from '../application';
import type { BlockchainEvent, TransactionId, BlockHeight } from '../domain';

// Simulated/Mock Data Source for Development
export class SimulatedBlockchainDataSource implements BlockchainDataSource {
  private currentHeight = 800000;
  private transactions = new Map<string, { confirmations: number }>();

  async getCurrentHeight(): Promise<BlockHeight> {
    return { value: this.currentHeight };
  }

  async getTransaction(txId: TransactionId): Promise<{ confirmations: number } | null> {
    return this.transactions.get(txId.hash) ?? null;
  }

  async getFeeEstimates(): Promise<{ low: number; medium: number; high: number }> {
    // Simulated fee rates in sat/vB
    return {
      low: 5,
      medium: 15,
      high: 30,
    };
  }

  // Test helpers
  simulateNewBlock(): void {
    this.currentHeight++;
    // Increment confirmations for all tracked transactions
    for (const [hash, tx] of this.transactions) {
      this.transactions.set(hash, { confirmations: tx.confirmations + 1 });
    }
  }

  addTransaction(hash: string, confirmations = 0): void {
    this.transactions.set(hash, { confirmations });
  }
}

// In-Memory Event Publisher for Development
export class InMemoryEventPublisher implements EventPublisher {
  private events: BlockchainEvent[] = [];
  private subscribers: Array<(event: BlockchainEvent) => void> = [];

  async publish(event: BlockchainEvent): Promise<void> {
    this.events.push(event);
    this.subscribers.forEach(sub => sub(event));
  }

  subscribe(handler: (event: BlockchainEvent) => void): () => void {
    this.subscribers.push(handler);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== handler);
    };
  }

  getEvents(): readonly BlockchainEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
