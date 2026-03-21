/**
 * BlockHeight Value Object
 */

export class BlockHeight {
  private constructor(readonly value: number) {}

  static create(height: number): BlockHeight {
    if (!Number.isInteger(height) || height < 0) {
      throw new Error(`Invalid block height: ${height}`);
    }
    return new BlockHeight(height);
  }

  isHigherThan(other: BlockHeight): boolean {
    return this.value > other.value;
  }

  difference(other: BlockHeight): number {
    return Math.abs(this.value - other.value);
  }
}
