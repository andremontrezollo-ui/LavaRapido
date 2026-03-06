import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface PaymentScheduledEvent extends DomainEvent {
  readonly type: 'PAYMENT_SCHEDULED';
  readonly paymentId: string;
  readonly scheduledFor: Date;
}

export function createPaymentScheduledEvent(paymentId: string, scheduledFor: Date): PaymentScheduledEvent {
  return { type: 'PAYMENT_SCHEDULED', paymentId, scheduledFor, timestamp: new Date() };
}
