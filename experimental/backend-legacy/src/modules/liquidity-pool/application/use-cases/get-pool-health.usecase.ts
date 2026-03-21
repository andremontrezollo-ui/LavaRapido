import type { LiquidityPoolRepository } from '../ports/liquidity-pool-repository.port';
import type { ObligationRepository } from '../ports/obligation-repository.port';
import type { PoolHealthDto } from '../dtos/pool-health.dto';
import { PoolHealthPolicy } from '../../domain/policies/pool-health.policy';

export class GetPoolHealthUseCase {
  private readonly policy = new PoolHealthPolicy();

  constructor(
    private readonly poolRepo: LiquidityPoolRepository,
    private readonly obligationRepo: ObligationRepository,
  ) {}

  async execute(poolId: string): Promise<PoolHealthDto | null> {
    const pool = await this.poolRepo.findById(poolId);
    if (!pool) return null;

    const pending = await this.obligationRepo.findPendingByPoolId(poolId);
    const health = this.policy.evaluate({ utilizationRate: pool.utilizationRate, pendingObligations: pending.length });

    return {
      poolId,
      status: health.status,
      utilizationRate: pool.utilizationRate,
      totalBalance: pool.totalBalance.toBtc(),
      availableBalance: pool.availableAmount.toBtc(),
      reservedBalance: pool.reservedAmount.toBtc(),
      pendingObligations: pending.length,
    };
  }
}
