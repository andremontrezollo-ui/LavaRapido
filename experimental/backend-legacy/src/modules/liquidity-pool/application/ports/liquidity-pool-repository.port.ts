import type { LiquidityPool } from '../../domain/entities/liquidity-pool.entity';

export interface LiquidityPoolRepository {
  findById(id: string): Promise<LiquidityPool | null>;
  save(pool: LiquidityPool): Promise<void>;
}
