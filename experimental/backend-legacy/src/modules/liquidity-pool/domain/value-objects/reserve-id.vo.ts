/**
 * ReserveId Value Object
 */

export class ReserveId {
  private constructor(readonly value: string) {}

  static create(id: string): ReserveId {
    if (!id || id.length === 0) throw new Error('ReserveId cannot be empty');
    return new ReserveId(id);
  }

  equals(other: ReserveId): boolean {
    return this.value === other.value;
  }
}
