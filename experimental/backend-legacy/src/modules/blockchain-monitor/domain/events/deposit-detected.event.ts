/**
 * DepositDetected Domain Event
 */

import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface DepositDetectedEvent extends DomainEvent {
  readonly type: 'DEPOSIT_DETECTED';
  readonly txId: string;
  readonly address: string;
  readonly amount: number;
  readonly blockHeight: number;
}

export function createDepositDetectedEvent(txId: string, address: string, amount: number, blockHeight: number): DepositDetectedEvent {
  return { type: 'DEPOSIT_DETECTED', txId, address, amount, blockHeight, timestamp: new Date() };
}
