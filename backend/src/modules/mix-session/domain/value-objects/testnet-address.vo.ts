/**
 * Value Object: TestnetAddress
 * Wraps a Bitcoin testnet deposit address, enforcing tb1q prefix format.
 */

export class TestnetAddress {
  private static readonly PATTERN = /^tb1q[a-z0-9]{38,59}$/;

  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): TestnetAddress {
    if (!TestnetAddress.PATTERN.test(raw)) {
      throw new Error(`Invalid testnet address: ${raw}`);
    }
    return new TestnetAddress(raw);
  }

  toString(): string {
    return this.value;
  }
}
