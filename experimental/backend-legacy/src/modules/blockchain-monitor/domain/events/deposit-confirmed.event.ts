/**
 * DepositConfirmed Domain Event
 * 
 * Consumed conceptually by liquidity-pool module.
 */

import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface DepositConfirmedEvent extends DomainEvent {
  readonly type: 'DEPOSIT_CONFIRMED';
  readonly txId: string;
  readonly confirmations: number;
}

export function createDepositConfirmedEvent(txId: string, confirmations: number): DepositConfirmedEvent {
  return { type: 'DEPOSIT_CONFIRMED', txId, confirmations, timestamp: new Date() };
}
