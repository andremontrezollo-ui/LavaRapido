/**
 * AddressGenerator Port
 * Abstracts the generation of a unique deposit address per session.
 */

export interface GeneratedAddress {
  value: string;
  network: 'testnet' | 'mainnet';
}

export interface AddressGenerator {
  generate(network: 'testnet' | 'mainnet'): GeneratedAddress;
}
