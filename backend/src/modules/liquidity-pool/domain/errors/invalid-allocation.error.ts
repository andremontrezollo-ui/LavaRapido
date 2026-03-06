export class InvalidAllocationError extends Error {
  constructor(reason: string) {
    super(`Invalid allocation: ${reason}`);
    this.name = 'InvalidAllocationError';
  }
}
