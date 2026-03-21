import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface PaymentCancelledEvent extends DomainEvent {
  readonly type: 'PAYMENT_CANCELLED';
  readonly paymentId: string;
  readonly reason: string;
}

export function createPaymentCancelledEvent(paymentId: string, reason: string): PaymentCancelledEvent {
  return { type: 'PAYMENT_CANCELLED', paymentId, reason, timestamp: new Date() };
}
