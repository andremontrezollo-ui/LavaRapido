/**
 * LiquidityPool Entity
 */

import { Amount } from '../value-objects/amount.vo';

export type PoolStatus = 'healthy' | 'warning' | 'critical';

export class LiquidityPool {
  constructor(
    readonly id: string,
    private _totalBalance: Amount,
    private _reservedAmount: Amount,
    private _status: PoolStatus,
    readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  get totalBalance(): Amount { return this._totalBalance; }
  get reservedAmount(): Amount { return this._reservedAmount; }
  get availableAmount(): Amount { return this._totalBalance.subtract(this._reservedAmount); }
  get status(): PoolStatus { return this._status; }
  get updatedAt(): Date { return this._updatedAt; }

  get utilizationRate(): number {
    if (this._totalBalance.toSat() === 0) return 0;
    return this._reservedAmount.toSat() / this._totalBalance.toSat();
  }

  credit(amount: Amount, now: Date): void {
    this._totalBalance = this._totalBalance.add(amount);
    this._updatedAt = now;
  }

  reserve(amount: Amount, now: Date): void {
    if (amount.isGreaterThan(this.availableAmount)) {
      throw new Error('Insufficient liquidity');
    }
    this._reservedAmount = this._reservedAmount.add(amount);
    this._updatedAt = now;
  }

  release(amount: Amount, now: Date): void {
    this._reservedAmount = this._reservedAmount.subtract(amount);
    this._updatedAt = now;
  }

  updateStatus(status: PoolStatus, now: Date): void {
    this._status = status;
    this._updatedAt = now;
  }
}
