import type { LiquidityPoolRepository } from '../ports/liquidity-pool-repository.port';
import type { ObligationRepository } from '../ports/obligation-repository.port';
import type { PoolEventPublisher } from '../ports/event-publisher.port';
import type { PoolClock } from '../ports/clock.port';
import { Obligation } from '../../domain/entities/obligation.entity';
import { ObligationId } from '../../domain/value-objects/obligation-id.vo';
import { Amount } from '../../domain/value-objects/amount.vo';
import { createObligationReservedEvent } from '../../domain/events/obligation-reserved.event';

export class ReserveObligationUseCase {
  constructor(
    private readonly poolRepo: LiquidityPoolRepository,
    private readonly obligationRepo: ObligationRepository,
    private readonly publisher: PoolEventPublisher,
    private readonly clock: PoolClock,
  ) {}

  async execute(poolId: string, obligationId: string, amount: number): Promise<void> {
    const pool = await this.poolRepo.findById(poolId);
    if (!pool) throw new Error(`Pool ${poolId} not found`);

    const now = this.clock.now();
    pool.reserve(Amount.btc(amount), now);

    const obligation = new Obligation(
      ObligationId.create(obligationId),
      poolId,
      Amount.btc(amount),
      'pending',
      now,
    );

    await this.poolRepo.save(pool);
    await this.obligationRepo.save(obligation);
    await this.publisher.publish(createObligationReservedEvent(obligationId, amount));
  }
}
