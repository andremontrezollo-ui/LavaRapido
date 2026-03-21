/**
 * Payment Scheduler - Infrastructure Layer
 * 
 * Job persistence, abstract clock, and adapters.
 */

import type { PaymentRepository, Clock, IdGenerator, EventPublisher } from '../application';
import type { ScheduledPayment, PaymentBatch, SchedulerEvent } from '../domain';

// System Clock Implementation
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

// Testable Clock for Simulations
export class TestClock implements Clock {
  private currentTime: Date;

  constructor(initialTime: Date = new Date()) {
    this.currentTime = initialTime;
  }

  now(): Date {
    return new Date(this.currentTime);
  }

  advance(seconds: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + seconds * 1000);
  }

  setTime(time: Date): void {
    this.currentTime = time;
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

// In-Memory Payment Repository
export class InMemoryPaymentRepository implements PaymentRepository {
  private payments = new Map<string, ScheduledPayment>();
  private batches = new Map<string, PaymentBatch>();

  async savePayment(payment: ScheduledPayment): Promise<void> {
    this.payments.set(payment.id, payment);
  }

  async saveBatch(batch: PaymentBatch): Promise<void> {
    this.batches.set(batch.id, batch);
  }

  async findPendingPayments(): Promise<ScheduledPayment[]> {
    return Array.from(this.payments.values()).filter(
      p => p.status === 'queued'
    );
  }

  async findPaymentsDueBy(time: Date): Promise<ScheduledPayment[]> {
    return Array.from(this.payments.values()).filter(
      p => p.status === 'queued' && p.scheduledFor <= time
    );
  }

  async updatePaymentStatus(
    id: string,
    status: ScheduledPayment['status']
  ): Promise<void> {
    const payment = this.payments.get(id);
    if (payment) {
      this.payments.set(id, { ...payment, status });
    }
  }

  // Test helpers
  clear(): void {
    this.payments.clear();
    this.batches.clear();
  }
}

// In-Memory Event Publisher
export class InMemorySchedulerEventPublisher implements EventPublisher {
  private events: SchedulerEvent[] = [];

  async publish(event: SchedulerEvent): Promise<void> {
    this.events.push(event);
  }

  getEvents(): readonly SchedulerEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
