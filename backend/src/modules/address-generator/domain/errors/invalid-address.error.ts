/**
 * InvalidAddressError
 * 
 * Thrown when an address does not match valid Bitcoin formats (bc1/tb1 bech32).
 */

export class InvalidAddressError extends Error {
  readonly code = 'INVALID_ADDRESS';

  constructor(address: string) {
    super(`Invalid Bitcoin address format: "${address}". Expected bc1 (mainnet) or tb1 (testnet) bech32 format.`);
    this.name = 'InvalidAddressError';
  }
}
