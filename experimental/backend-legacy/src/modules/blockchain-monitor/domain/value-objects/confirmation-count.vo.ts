/**
 * ConfirmationCount Value Object
 */

export class ConfirmationCount {
  private constructor(readonly count: number) {}

  static create(count: number): ConfirmationCount {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`Invalid confirmation count: ${count}`);
    }
    return new ConfirmationCount(count);
  }

  isConfirmed(threshold: number): boolean {
    return this.count >= threshold;
  }

  increment(): ConfirmationCount {
    return new ConfirmationCount(this.count + 1);
  }
}
