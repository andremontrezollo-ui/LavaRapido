/**
 * DepositAddress Value Object
 * Represents a testnet or mainnet Bitcoin deposit address.
 */

const TESTNET_RE = /^tb1[a-z0-9]{39,59}$/;
const MAINNET_RE = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;

export type AddressNetwork = 'testnet' | 'mainnet';

export class DepositAddress {
  private constructor(
    readonly value: string,
    readonly network: AddressNetwork,
  ) {}

  static create(value: string): DepositAddress {
    if (TESTNET_RE.test(value)) return new DepositAddress(value, 'testnet');
    if (MAINNET_RE.test(value)) return new DepositAddress(value, 'mainnet');
    throw new Error(`Invalid deposit address format: "${value}"`);
  }

  /** Create without format validation (used when reading from trusted storage). */
  static fromStorage(value: string, network: AddressNetwork): DepositAddress {
    return new DepositAddress(value, network);
  }

  equals(other: DepositAddress): boolean {
    return this.value === other.value;
  }
}
