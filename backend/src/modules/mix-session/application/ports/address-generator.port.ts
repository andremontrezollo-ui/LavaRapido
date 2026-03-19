/**
 * MixAddressGenerator Port
 *
 * Abstraction for deposit address generation, allowing testnet or mainnet
 * implementations to be swapped without touching business logic.
 */
export interface MixAddressGenerator {
  generateDepositAddress(): string;
}
