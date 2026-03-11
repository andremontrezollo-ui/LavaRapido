/**
 * Blockchain Monitor - Infrastructure Layer
 * 
 * Adapters for data sources and simulators.
 * Implements ports defined in application layer.
 */

import type { BlockchainSource, BlockchainEventPublisher } from '../application';
import type { DomainEvent } from '../../../shared/events/DomainEvent';
import { BlockHeight } from '../domain/value-objects/block-height.vo';
import { TxId } from '../domain/value-objects/txid.vo';

// Simulated/Mock Data Source for Development
export class SimulatedBlockchainDataSource implements BlockchainSource {
  private currentHeight = 800000;
  private transactions = new Map<string, { confirmations: number }>();

  async poll(): Promise<[]> {
    return [];
  }

  async getCurrentBlockHeight(): Promise<number> {
    return this.currentHeight;
  }

  async getTransactionConfirmations(txId: string): Promise<number | null> {
    return this.transactions.get(txId)?.confirmations ?? null;
  }

  // Test helpers
  simulateNewBlock(): void {
    this.currentHeight++;
    for (const [hash, tx] of this.transactions) {
      this.transactions.set(hash, { confirmations: tx.confirmations + 1 });
    }
  }

  addTransaction(hash: string, confirmations = 0): void {
    this.transactions.set(hash, { confirmations });
  }
}

// In-Memory Event Publisher for Development
export class InMemoryEventPublisher implements BlockchainEventPublisher {
  private events: DomainEvent[] = [];
  private subscribers: Array<(event: DomainEvent) => void> = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
    this.subscribers.forEach(sub => sub(event));
  }

  subscribe(handler: (event: DomainEvent) => void): () => void {
    this.subscribers.push(handler);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== handler);
    };
  }

  getEvents(): readonly DomainEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
