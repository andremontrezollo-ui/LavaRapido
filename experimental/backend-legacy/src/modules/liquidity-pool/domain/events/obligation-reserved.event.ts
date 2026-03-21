import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface ObligationReservedEvent extends DomainEvent {
  readonly type: 'OBLIGATION_RESERVED';
  readonly obligationId: string;
  readonly amount: number;
}

export function createObligationReservedEvent(obligationId: string, amount: number): ObligationReservedEvent {
  return { type: 'OBLIGATION_RESERVED', obligationId, amount, timestamp: new Date() };
}
