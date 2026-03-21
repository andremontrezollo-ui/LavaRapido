export interface LiquidityPoolRecord { id: string; totalBalance: number; reservedAmount: number; status: string; createdAt: string; updatedAt: string; }

export class LiquidityPoolMapper {
  static toRecord(pool: { id: string; totalBalance: { toBtc(): number }; reservedAmount: { toBtc(): number }; status: string; createdAt: Date; updatedAt: Date }): LiquidityPoolRecord {
    return { id: pool.id, totalBalance: pool.totalBalance.toBtc(), reservedAmount: pool.reservedAmount.toBtc(), status: pool.status, createdAt: pool.createdAt.toISOString(), updatedAt: pool.updatedAt.toISOString() };
  }
}
