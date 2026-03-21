/**
 * ConfirmationState Entity
 */

import { ConfirmationCount } from '../value-objects/confirmation-count.vo';

export class ConfirmationState {
  constructor(
    readonly txId: string,
    private _current: ConfirmationCount,
    readonly required: number,
    private _isFinalized: boolean = false,
  ) {}

  get current(): ConfirmationCount { return this._current; }
  get isFinalized(): boolean { return this._isFinalized; }

  update(newCount: ConfirmationCount): void {
    this._current = newCount;
    if (newCount.isConfirmed(this.required)) {
      this._isFinalized = true;
    }
  }

  meetsThreshold(): boolean {
    return this._current.isConfirmed(this.required);
  }
}
