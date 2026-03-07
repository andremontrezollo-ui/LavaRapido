/**
 * AllocateLiquidity Use Case — with idempotency guard.
 */

import type { LiquidityPoolRepository } from '../ports/liquidity-pool-repository.port';
import type { PoolEventPublisher } from '../ports/event-publisher.port';
import type { PoolClock } from '../ports/clock.port';
import type { LiquidityAllocationDto } from '../dtos/liquidity-allocation.dto';
import type { IdempotencyStore } from '../../../../shared/policies/idempotency-policy';
import { Amount } from '../../domain/value-objects/amount.vo';
import { AllocationPolicy } from '../../domain/policies/allocation-policy';
import { createLiquidityAllocatedEvent } from '../../domain/events/liquidity-allocated.event';
import { IdempotencyGuard } from '../../../../shared/policies/idempotency-policy';

export class AllocateLiquidityUseCase {
  private readonly policy = new AllocationPolicy();
  private readonly idempotencyGuard: IdempotencyGuard;

  constructor(
    private readonly poolRepo: LiquidityPoolRepository,
    private readonly publisher: PoolEventPublisher,
    private readonly clock: PoolClock,
    idempotencyStore: IdempotencyStore,
  ) {
    this.idempotencyGuard = new IdempotencyGuard(idempotencyStore, 3600);
  }

  async execute(dto: LiquidityAllocationDto): Promise<void> {
    const idempotencyKey = `allocate:${dto.allocationId}`;

    await this.idempotencyGuard.executeOnce(idempotencyKey, async () => {
      const pool = await this.poolRepo.findById(dto.poolId);
      if (!pool) throw new Error(`Pool ${dto.poolId} not found`);

      const check = this.policy.evaluate({
        requestedAmount: dto.amount,
        availableAmount: pool.availableAmount.toBtc(),
        poolStatus: pool.status,
      });

      if (!check.allowed) throw new Error(check.reason);

      pool.reserve(Amount.btc(dto.amount), this.clock.now());
      await this.poolRepo.save(pool);
      await this.publisher.publish(createLiquidityAllocatedEvent(dto.allocationId, dto.amount, dto.poolId));
    });
  }
}
