/**
 * PaymentExecuted Domain Event
 * Consumed conceptually by log-minimizer for audit logging.
 */

import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface PaymentExecutedEvent extends DomainEvent {
  readonly type: 'PAYMENT_EXECUTED';
  readonly paymentId: string;
  readonly success: boolean;
}

export function createPaymentExecutedEvent(paymentId: string, success: boolean): PaymentExecutedEvent {
  return { type: 'PAYMENT_EXECUTED', paymentId, success, timestamp: new Date() };
}
