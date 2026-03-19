/**
 * Port: AddressGeneratorPort
 * Generates a fresh testnet deposit address for a new mix session.
 * Implemented by infrastructure adapters.
 */

export interface AddressGeneratorPort {
  generateTestnetAddress(): string;
}
