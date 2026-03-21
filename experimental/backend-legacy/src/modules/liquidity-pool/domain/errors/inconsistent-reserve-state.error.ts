export class InconsistentReserveStateError extends Error {
  constructor(poolId: string, reason: string) {
    super(`Inconsistent reserve state for pool ${poolId}: ${reason}`);
    this.name = 'InconsistentReserveStateError';
  }
}
