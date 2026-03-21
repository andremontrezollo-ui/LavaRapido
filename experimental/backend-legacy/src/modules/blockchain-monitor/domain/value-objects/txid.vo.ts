/**
 * TxId Value Object
 */

import { InvalidTxIdError } from '../errors/invalid-txid.error';

export class TxId {
  private constructor(readonly value: string) {}

  static create(hash: string): TxId {
    if (!hash || !/^[a-fA-F0-9]{64}$/.test(hash)) {
      throw new InvalidTxIdError(hash);
    }
    return new TxId(hash.toLowerCase());
  }

  equals(other: TxId): boolean {
    return this.value === other.value;
  }
}
