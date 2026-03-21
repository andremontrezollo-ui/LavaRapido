/**
 * BlockObservation Entity
 */

import { BlockHeight } from '../value-objects/block-height.vo';

export class BlockObservation {
  constructor(
    readonly id: string,
    readonly height: BlockHeight,
    readonly transactionCount: number,
    readonly observedAt: Date,
  ) {}
}
