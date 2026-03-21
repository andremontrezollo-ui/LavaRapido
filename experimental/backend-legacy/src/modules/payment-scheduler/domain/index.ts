/**
 * Payment Scheduler - Domain Layer
 * 
 * Scheduling policies, time windows, and batch management.
 */

// Value Objects
export interface TimeWindow {
  readonly startTime: Date;
  readonly endTime: Date;
  readonly durationSeconds: number;
}

export interface SchedulingPolicy {
  readonly type: 'immediate' | 'delayed' | 'random-window';
  readonly minDelaySeconds?: number;
  readonly maxDelaySeconds?: number;
  readonly batchSize?: number;
}

export interface PaymentBatch {
  readonly id: string;
  readonly payments: ScheduledPayment[];
  readonly window: TimeWindow;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ScheduledPayment {
  readonly id: string;
  readonly amount: number;
  readonly scheduledFor: Date;
  readonly status: 'queued' | 'processing' | 'completed' | 'failed';
  readonly retryCount: number;
}

// Domain Events
export interface PaymentPlannedEvent {
  readonly type: 'PAYMENT_PLANNED';
  readonly paymentId: string;
  readonly scheduledFor: Date;
  readonly windowStart: Date;
  readonly windowEnd: Date;
  readonly timestamp: Date;
}

export interface PaymentBatchCreatedEvent {
  readonly type: 'PAYMENT_BATCH_CREATED';
  readonly batchId: string;
  readonly paymentCount: number;
  readonly window: TimeWindow;
  readonly timestamp: Date;
}

export interface PaymentExecutedEvent {
  readonly type: 'PAYMENT_EXECUTED';
  readonly paymentId: string;
  readonly batchId?: string;
  readonly success: boolean;
  readonly timestamp: Date;
}

export type SchedulerEvent = 
  | PaymentPlannedEvent 
  | PaymentBatchCreatedEvent 
  | PaymentExecutedEvent;

// Factory Functions
export function createTimeWindow(
  startTime: Date,
  durationSeconds: number
): TimeWindow {
  return {
    startTime,
    endTime: new Date(startTime.getTime() + durationSeconds * 1000),
    durationSeconds,
  };
}

export function calculateRandomDelay(
  minSeconds: number,
  maxSeconds: number
): number {
  const range = maxSeconds - minSeconds;
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  return minSeconds + (randomBytes[0] % range);
}
