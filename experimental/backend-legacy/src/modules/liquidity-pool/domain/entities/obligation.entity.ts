/**
 * Obligation Entity
 */

import { ObligationId } from '../value-objects/obligation-id.vo';
import { Amount } from '../value-objects/amount.vo';

export type ObligationStatus = 'pending' | 'fulfilled' | 'expired' | 'cancelled';

export class Obligation {
  constructor(
    readonly id: ObligationId,
    readonly poolId: string,
    readonly amount: Amount,
    private _status: ObligationStatus,
    readonly createdAt: Date,
    private _resolvedAt: Date | null = null,
  ) {}

  get status(): ObligationStatus { return this._status; }
  get resolvedAt(): Date | null { return this._resolvedAt; }

  fulfill(now: Date): void {
    this._status = 'fulfilled';
    this._resolvedAt = now;
  }

  expire(now: Date): void {
    this._status = 'expired';
    this._resolvedAt = now;
  }

  cancel(now: Date): void {
    this._status = 'cancelled';
    this._resolvedAt = now;
  }

  isPending(): boolean {
    return this._status === 'pending';
  }
}
