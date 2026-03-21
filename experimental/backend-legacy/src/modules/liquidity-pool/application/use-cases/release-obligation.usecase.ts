import type { LiquidityPoolRepository } from '../ports/liquidity-pool-repository.port';
import type { ObligationRepository } from '../ports/obligation-repository.port';
import type { PoolClock } from '../ports/clock.port';

export class ReleaseObligationUseCase {
  constructor(
    private readonly poolRepo: LiquidityPoolRepository,
    private readonly obligationRepo: ObligationRepository,
    private readonly clock: PoolClock,
  ) {}

  async execute(obligationId: string, reason: 'fulfilled' | 'expired' | 'cancelled'): Promise<void> {
    const obligation = await this.obligationRepo.findById(obligationId);
    if (!obligation || !obligation.isPending()) return;

    const pool = await this.poolRepo.findById(obligation.poolId);
    if (!pool) return;

    const now = this.clock.now();

    if (reason === 'fulfilled') obligation.fulfill(now);
    else if (reason === 'expired') obligation.expire(now);
    else obligation.cancel(now);

    pool.release(obligation.amount, now);

    await this.poolRepo.save(pool);
    await this.obligationRepo.save(obligation);
  }
}
