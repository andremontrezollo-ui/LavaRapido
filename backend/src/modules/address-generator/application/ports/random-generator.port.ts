/**
 * RandomGenerator Port
 * 
 * Abstraction for cryptographically secure random value generation.
 */

export interface RandomGenerator {
  generateId(): string;
  generateAddressBytes(length: number): Uint8Array;
}
