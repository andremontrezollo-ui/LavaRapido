export class InsufficientLiquidityError extends Error {
  constructor(requested: number, available: number) {
    super(`Insufficient liquidity: requested ${requested}, available ${available}`);
    this.name = 'InsufficientLiquidityError';
  }
}
