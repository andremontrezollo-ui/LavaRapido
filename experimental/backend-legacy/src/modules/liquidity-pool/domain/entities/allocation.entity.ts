/**
 * Allocation Entity
 */

import { Amount } from '../value-objects/amount.vo';

export class Allocation {
  constructor(
    readonly id: string,
    readonly poolId: string,
    readonly amount: Amount,
    readonly destination: string,
    readonly allocatedAt: Date,
  ) {}
}
