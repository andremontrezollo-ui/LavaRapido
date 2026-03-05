/**
 * CryptoRandomGenerator
 * 
 * Cryptographically secure random generation using Web Crypto API.
 */

import type { RandomGenerator } from '../../application/ports/random-generator.port';

export class CryptoRandomGenerator implements RandomGenerator {
  generateId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  generateAddressBytes(length: number): Uint8Array {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
  }
}
