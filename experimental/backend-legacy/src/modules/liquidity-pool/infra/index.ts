/**
 * Liquidity Pool - Infrastructure Layer
 * 
 * Ledger storage and metrics adapters.
 */

import type { PoolLedger, IdGenerator, EventPublisher } from '../application';
import type { Reserve, Obligation, PoolEvent } from '../domain';

// In-Memory Pool Ledger
export class InMemoryPoolLedger implements PoolLedger {
  private reserve: Reserve = {
    totalAmount: 100,
    availableAmount: 100,
    reservedAmount: 0,
    currency: 'BTC',
  };
  private obligations = new Map<string, Obligation>();

  async getReserve(): Promise<Reserve> {
    return { ...this.reserve };
  }

  async updateReserve(reserve: Reserve): Promise<void> {
    this.reserve = reserve;
  }

  async saveObligation(obligation: Obligation): Promise<void> {
    this.obligations.set(obligation.id, obligation);
  }

  async findObligation(id: string): Promise<Obligation | null> {
    return this.obligations.get(id) ?? null;
  }

  async updateObligation(obligation: Obligation): Promise<void> {
    this.obligations.set(obligation.id, obligation);
  }

  async findPendingObligations(): Promise<Obligation[]> {
    return Array.from(this.obligations.values()).filter(
      o => o.status === 'pending'
    );
  }

  // Test helpers
  setInitialReserve(amount: number): void {
    this.reserve = {
      totalAmount: amount,
      availableAmount: amount,
      reservedAmount: 0,
      currency: 'BTC',
    };
  }

  clear(): void {
    this.reserve = {
      totalAmount: 100,
      availableAmount: 100,
      reservedAmount: 0,
      currency: 'BTC',
    };
    this.obligations.clear();
  }
}

// Secure ID Generator
export class CryptoIdGenerator implements IdGenerator {
  generate(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
}

// In-Memory Event Publisher
export class InMemoryPoolEventPublisher implements EventPublisher {
  private events: PoolEvent[] = [];

  async publish(event: PoolEvent): Promise<void> {
    this.events.push(event);
  }

  getEvents(): readonly PoolEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}

// Metrics Collector (for observability)
export class PoolMetricsCollector {
  private metrics: {
    reservations: number;
    fulfillments: number;
    expirations: number;
    healthChanges: number;
  } = {
    reservations: 0,
    fulfillments: 0,
    expirations: 0,
    healthChanges: 0,
  };

  recordReservation(): void {
    this.metrics.reservations++;
  }

  recordFulfillment(): void {
    this.metrics.fulfillments++;
  }

  recordExpiration(): void {
    this.metrics.expirations++;
  }

  recordHealthChange(): void {
    this.metrics.healthChanges++;
  }

  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      reservations: 0,
      fulfillments: 0,
      expirations: 0,
      healthChanges: 0,
    };
  }
}
