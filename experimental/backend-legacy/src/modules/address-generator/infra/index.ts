/**
 * Address Generator - Infrastructure Layer
 * 
 * Repositories, adapters, and mappers implementing application ports.
 */

// Repositories
export { InMemoryAddressRepository } from './repositories/address.repository';
export { InMemoryTokenRepository } from './repositories/token.repository';

// Adapters
export { CryptoRandomGenerator } from './adapters/random-generator.adapter';
export { MockAddressGenerator } from './adapters/mock-address-generator.adapter';

// Mappers
export { AddressMapper } from './mappers/address.mapper';
export type { AddressRecord } from './mappers/address.mapper';
