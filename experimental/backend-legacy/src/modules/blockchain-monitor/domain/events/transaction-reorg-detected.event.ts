/**
 * TransactionReorgDetected Domain Event
 */

import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface TransactionReorgDetectedEvent extends DomainEvent {
  readonly type: 'TRANSACTION_REORG_DETECTED';
  readonly txId: string;
  readonly previousBlock: number;
  readonly newBlock: number;
}

export function createTransactionReorgDetectedEvent(txId: string, previousBlock: number, newBlock: number): TransactionReorgDetectedEvent {
  return { type: 'TRANSACTION_REORG_DETECTED', txId, previousBlock, newBlock, timestamp: new Date() };
}
