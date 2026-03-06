/**
 * ReserveBalance Entity
 */

import { Amount } from '../value-objects/amount.vo';

export class ReserveBalance {
  constructor(
    readonly id: string,
    readonly poolId: string,
    private _balance: Amount,
    readonly lastUpdated: Date,
  ) {}

  get balance(): Amount { return this._balance; }

  update(newBalance: Amount): void {
    this._balance = newBalance;
  }
}
