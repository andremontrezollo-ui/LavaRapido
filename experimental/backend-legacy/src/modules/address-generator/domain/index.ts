/**
 * Address Generator - Domain Layer
 * 
 * Entities, value objects, policies, events, and errors.
 */

// Entities
export { Address } from './entities/address.entity';
export type { AddressProps, AddressStatus } from './entities/address.entity';
export { AddressToken } from './entities/address-token.entity';
export type { AddressTokenProps } from './entities/address-token.entity';

// Value Objects
export { BitcoinAddress } from './value-objects/bitcoin-address.vo';
export type { AddressNetwork } from './value-objects/bitcoin-address.vo';
export { AddressNamespace } from './value-objects/address-namespace.vo';
export type { NamespacePurpose } from './value-objects/address-namespace.vo';

// Policies
export { AddressExpirationPolicy } from './policies/address-expiration.policy';
export type { ExpirationInput, ExpirationResult } from './policies/address-expiration.policy';
export { AddressGenerationPolicy } from './policies/address-generation.policy';
export type { GenerationInput, GenerationResult } from './policies/address-generation.policy';

// Events
export { createAddressGeneratedEvent } from './events/address-generated.event';
export type { AddressGeneratedEvent } from './events/address-generated.event';
export { createTokenIssuedEvent } from './events/token-issued.event';
export type { TokenIssuedEvent } from './events/token-issued.event';

// Errors
export { InvalidAddressError } from './errors/invalid-address.error';
export { AddressExpiredError } from './errors/address-expired.error';
