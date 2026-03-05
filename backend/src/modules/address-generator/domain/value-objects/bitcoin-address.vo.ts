/**
 * BitcoinAddress Value Object
 * 
 * Validates and encapsulates Bitcoin address formats.
 * Supports mainnet (bc1) and testnet (tb1) bech32 addresses.
 */

import { InvalidAddressError } from '../errors/invalid-address.error';

const BECH32_MAINNET = /^bc1[a-z0-9]{39,59}$/;
const BECH32_TESTNET = /^tb1[a-z0-9]{39,59}$/;

export type AddressNetwork = 'mainnet' | 'testnet';

export class BitcoinAddress {
  readonly value: string;
  readonly network: AddressNetwork;

  private constructor(value: string, network: AddressNetwork) {
    this.value = value;
    this.network = network;
  }

  static create(raw: string): BitcoinAddress {
    const trimmed = raw.trim().toLowerCase();

    if (BECH32_MAINNET.test(trimmed)) {
      return new BitcoinAddress(trimmed, 'mainnet');
    }

    if (BECH32_TESTNET.test(trimmed)) {
      return new BitcoinAddress(trimmed, 'testnet');
    }

    throw new InvalidAddressError(raw);
  }

  equals(other: BitcoinAddress): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
