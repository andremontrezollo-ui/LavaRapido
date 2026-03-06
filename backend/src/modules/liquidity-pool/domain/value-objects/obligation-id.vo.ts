/**
 * ObligationId Value Object
 */

export class ObligationId {
  private constructor(readonly value: string) {}

  static create(id: string): ObligationId {
    if (!id || id.length === 0) throw new Error('ObligationId cannot be empty');
    return new ObligationId(id);
  }

  equals(other: ObligationId): boolean {
    return this.value === other.value;
  }
}
