import type { LiquidityPoolRepository } from '../ports/liquidity-pool-repository.port';
import type { PoolEventPublisher } from '../ports/event-publisher.port';
import type { PoolClock } from '../ports/clock.port';
import { createPoolRebalancedEvent } from '../../domain/events/pool-rebalanced.event';

export class RebalancePoolUseCase {
  constructor(
    private readonly poolRepo: LiquidityPoolRepository,
    private readonly publisher: PoolEventPublisher,
    private readonly clock: PoolClock,
  ) {}

  async execute(poolId: string, targetBalance: number): Promise<void> {
    const pool = await this.poolRepo.findById(poolId);
    if (!pool) throw new Error(`Pool ${poolId} not found`);

    const previous = pool.totalBalance.toBtc();
    // Rebalance is a conceptual operation
    await this.publisher.publish(createPoolRebalancedEvent(poolId, previous, targetBalance));
  }
}
