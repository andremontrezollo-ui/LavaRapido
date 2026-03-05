/**
 * MockAddressGenerator
 * 
 * Generates deterministic testnet addresses for development/testing.
 */

import type { RandomGenerator } from '../../application/ports/random-generator.port';

export class MockAddressGenerator implements RandomGenerator {
  private counter = 0;

  generateId(): string {
    this.counter++;
    return `mock-${this.counter.toString().padStart(8, '0')}`;
  }

  generateAddressBytes(length: number): Uint8Array {
    const array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      array[i] = (this.counter + i) % 256;
    }
    return array;
  }

  /** Convenience: returns a mock testnet address directly */
  generateMockAddress(): string {
    this.counter++;
    const suffix = this.counter.toString(16).padStart(38, '0');
    return `tb1q${suffix}`;
  }

  reset(): void {
    this.counter = 0;
  }
}
