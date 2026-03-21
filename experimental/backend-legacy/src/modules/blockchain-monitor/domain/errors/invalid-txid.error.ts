export class InvalidTxIdError extends Error {
  constructor(txId: string) {
    super(`Invalid transaction ID: ${txId}. Must be 64-char hex string.`);
    this.name = 'InvalidTxIdError';
  }
}
