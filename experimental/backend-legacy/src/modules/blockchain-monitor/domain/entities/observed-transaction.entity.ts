/**
 * ObservedTransaction Entity
 */

import { TxId } from '../value-objects/txid.vo';
import { ConfirmationCount } from '../value-objects/confirmation-count.vo';
import { BlockHeight } from '../value-objects/block-height.vo';

export type TransactionStatus = 'pending' | 'confirmed' | 'dropped' | 'reorged';

export class ObservedTransaction {
  constructor(
    readonly id: string,
    readonly txId: TxId,
    readonly address: string,
    readonly amount: number,
    private _confirmations: ConfirmationCount,
    private _blockHeight: BlockHeight,
    private _status: TransactionStatus,
    readonly firstSeen: Date,
    private _lastUpdated: Date,
  ) {}

  get confirmations(): ConfirmationCount { return this._confirmations; }
  get blockHeight(): BlockHeight { return this._blockHeight; }
  get status(): TransactionStatus { return this._status; }
  get lastUpdated(): Date { return this._lastUpdated; }

  updateConfirmations(count: ConfirmationCount, now: Date): void {
    this._confirmations = count;
    this._lastUpdated = now;
  }

  markConfirmed(now: Date): void {
    this._status = 'confirmed';
    this._lastUpdated = now;
  }

  markReorged(newBlockHeight: BlockHeight, now: Date): void {
    this._status = 'reorged';
    this._blockHeight = newBlockHeight;
    this._lastUpdated = now;
  }

  markDropped(now: Date): void {
    this._status = 'dropped';
    this._lastUpdated = now;
  }

  isConfirmed(threshold: number): boolean {
    return this._confirmations.isConfirmed(threshold);
  }
}
