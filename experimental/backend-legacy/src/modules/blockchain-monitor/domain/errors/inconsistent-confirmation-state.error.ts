export class InconsistentConfirmationStateError extends Error {
  constructor(txId: string, reason: string) {
    super(`Inconsistent confirmation state for tx ${txId}: ${reason}`);
    this.name = 'InconsistentConfirmationStateError';
  }
}
