import type { LiquidityPoolRepository } from '../../application/ports/liquidity-pool-repository.port';
import type { LiquidityPool } from '../../domain/entities/liquidity-pool.entity';

export class InMemoryLiquidityPoolRepository implements LiquidityPoolRepository {
  private store = new Map<string, LiquidityPool>();

  async findById(id: string): Promise<LiquidityPool | null> {
    return this.store.get(id) ?? null;
  }

  async save(pool: LiquidityPool): Promise<void> {
    this.store.set(pool.id, pool);
  }
}
