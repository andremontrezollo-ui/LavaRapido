/**
 * Payment Scheduler - Application Layer
 * 
 * Use cases: plan simulated outputs, publish "payment planned" events.
 */

import type {
  ScheduledPayment,
  PaymentBatch,
  SchedulingPolicy,
  TimeWindow,
  SchedulerEvent,
  PaymentPlannedEvent,
  PaymentBatchCreatedEvent
} from '../domain';
import { createTimeWindow, calculateRandomDelay } from '../domain';

// Ports
export interface PaymentRepository {
  savePayment(payment: ScheduledPayment): Promise<void>;
  saveBatch(batch: PaymentBatch): Promise<void>;
  findPendingPayments(): Promise<ScheduledPayment[]>;
  findPaymentsDueBy(time: Date): Promise<ScheduledPayment[]>;
  updatePaymentStatus(id: string, status: ScheduledPayment['status']): Promise<void>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  generate(): string;
}

export interface EventPublisher {
  publish(event: SchedulerEvent): Promise<void>;
}

// Use Cases
export class PlanPaymentUseCase {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly publisher: EventPublisher
  ) {}

  async execute(
    amount: number,
    policy: SchedulingPolicy
  ): Promise<ScheduledPayment> {
    const now = this.clock.now();
    let scheduledFor: Date;
    let window: TimeWindow;

    switch (policy.type) {
      case 'immediate':
        scheduledFor = now;
        window = createTimeWindow(now, 60); // 1 minute window
        break;
      case 'delayed':
        const delay = policy.minDelaySeconds ?? 300;
        scheduledFor = new Date(now.getTime() + delay * 1000);
        window = createTimeWindow(scheduledFor, 60);
        break;
      case 'random-window':
        const randomDelay = calculateRandomDelay(
          policy.minDelaySeconds ?? 300,
          policy.maxDelaySeconds ?? 3600
        );
        scheduledFor = new Date(now.getTime() + randomDelay * 1000);
        window = createTimeWindow(
          scheduledFor,
          policy.maxDelaySeconds ?? 3600
        );
        break;
    }

    const payment: ScheduledPayment = {
      id: this.idGenerator.generate(),
      amount,
      scheduledFor,
      status: 'queued',
      retryCount: 0,
    };

    await this.repository.savePayment(payment);

    const event: PaymentPlannedEvent = {
      type: 'PAYMENT_PLANNED',
      paymentId: payment.id,
      scheduledFor,
      windowStart: window.startTime,
      windowEnd: window.endTime,
      timestamp: now,
    };
    await this.publisher.publish(event);

    return payment;
  }
}

export class CreateBatchUseCase {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly publisher: EventPublisher
  ) {}

  async execute(batchSize: number = 10): Promise<PaymentBatch | null> {
    const pendingPayments = await this.repository.findPendingPayments();
    
    if (pendingPayments.length === 0) {
      return null;
    }

    const paymentsForBatch = pendingPayments.slice(0, batchSize);
    const now = this.clock.now();
    const window = createTimeWindow(now, 3600); // 1 hour processing window

    const batch: PaymentBatch = {
      id: this.idGenerator.generate(),
      payments: paymentsForBatch,
      window,
      status: 'pending',
    };

    await this.repository.saveBatch(batch);

    const event: PaymentBatchCreatedEvent = {
      type: 'PAYMENT_BATCH_CREATED',
      batchId: batch.id,
      paymentCount: paymentsForBatch.length,
      window,
      timestamp: now,
    };
    await this.publisher.publish(event);

    return batch;
  }
}
