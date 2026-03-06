import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface PaymentDueEvent extends DomainEvent {
  readonly type: 'PAYMENT_DUE';
  readonly paymentId: string;
}

export function createPaymentDueEvent(paymentId: string): PaymentDueEvent {
  return { type: 'PAYMENT_DUE', paymentId, timestamp: new Date() };
}
