/**
 * Blockchain Monitor - Infrastructure Layer
 * 
 * Adapters for data sources and simulators.
 * Implements ports defined in application layer.
 */

import type { BlockchainSource, BlockchainEventPublisher } from '../application';
import type { DomainEvent } from '../../../shared/events/DomainEvent';
import type { BlockchainEventDto } from '../application/dtos/blockchain-event.dto';

// Simulated/Mock Data Source for Development
export class SimulatedBlockchainDataSource implements BlockchainSource {
  private currentHeight = 800000;
  private confirmations = new Map<string, number>();
  private pendingEvents: BlockchainEventDto[] = [];

  async poll(): Promise<BlockchainEventDto[]> {
    const events = this.pendingEvents.splice(0);
    return events;
  }

  async getCurrentBlockHeight(): Promise<number> {
    return this.currentHeight;
  }

  async getTransactionConfirmations(txId: string): Promise<number | null> {
    return this.confirmations.get(txId) ?? null;
  }

  // Test helpers
  simulateNewBlock(): void {
    this.currentHeight++;
    for (const [txId, count] of this.confirmations) {
      this.confirmations.set(txId, count + 1);
    }
  }

  addTransaction(txId: string, address: string, amount: number, confirmations = 0): void {
    this.confirmations.set(txId, confirmations);
    this.pendingEvents.push({
      eventType: 'new_transaction',
      txId,
      address,
      amount,
      blockHeight: this.currentHeight,
      confirmations,
    });
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
