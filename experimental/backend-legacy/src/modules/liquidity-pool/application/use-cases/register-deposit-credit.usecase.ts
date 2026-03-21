/**
 * RegisterDepositCredit Use Case
 * Reacts conceptually to DEPOSIT_CONFIRMED from blockchain-monitor.
 */

import type { LiquidityPoolRepository } from '../ports/liquidity-pool-repository.port';
import type { PoolClock } from '../ports/clock.port';
import type { DepositCreditDto } from '../dtos/deposit-credit.dto';
import { Amount } from '../../domain/value-objects/amount.vo';

export class RegisterDepositCreditUseCase {
  constructor(
    private readonly poolRepo: LiquidityPoolRepository,
    private readonly clock: PoolClock,
  ) {}

  async execute(dto: DepositCreditDto): Promise<void> {
    const pool = await this.poolRepo.findById(dto.poolId);
    if (!pool) throw new Error(`Pool ${dto.poolId} not found`);

    pool.credit(Amount.btc(dto.amount), this.clock.now());
    await this.poolRepo.save(pool);
  }
}
