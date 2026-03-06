/**
 * Amount Value Object
 */

export class Amount {
  private constructor(readonly value: number, readonly currency: 'BTC' | 'SAT') {}

  static btc(value: number): Amount {
    if (value < 0) throw new Error(`Amount cannot be negative: ${value}`);
    return new Amount(value, 'BTC');
  }

  static sat(value: number): Amount {
    if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid satoshi amount: ${value}`);
    return new Amount(value, 'SAT');
  }

  toSat(): number {
    return this.currency === 'BTC' ? Math.round(this.value * 100_000_000) : this.value;
  }

  toBtc(): number {
    return this.currency === 'SAT' ? this.value / 100_000_000 : this.value;
  }

  add(other: Amount): Amount {
    return Amount.sat(this.toSat() + other.toSat());
  }

  subtract(other: Amount): Amount {
    const result = this.toSat() - other.toSat();
    if (result < 0) throw new Error('Insufficient amount');
    return Amount.sat(result);
  }

  isGreaterThan(other: Amount): boolean {
    return this.toSat() > other.toSat();
  }
}
