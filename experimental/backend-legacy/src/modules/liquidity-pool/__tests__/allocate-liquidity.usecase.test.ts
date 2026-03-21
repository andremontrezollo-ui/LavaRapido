import { describe, it, expect } from 'vitest';
import { AllocateLiquidityUseCase } from '../application/use-cases/allocate-liquidity.usecase';
import { InMemoryLiquidityPoolRepository } from '../infra/repositories/liquidity-pool.repository';
import { LiquidityPool } from '../domain/entities/liquidity-pool.entity';
import { Amount } from '../domain/value-objects/amount.vo';

describe('AllocateLiquidityUseCase', () => {
  it('should allocate liquidity from healthy pool', async () => {
    const repo = new InMemoryLiquidityPoolRepository();
    const now = new Date();
    const pool = new LiquidityPool('pool-1', Amount.btc(10), Amount.btc(0), 'healthy', now, now);
    await repo.save(pool);

    const events: any[] = [];
    const publisher = { publish: async (e: any) => { events.push(e); } };
    const clock = { now: () => new Date() };

    const uc = new AllocateLiquidityUseCase(repo, publisher, clock);
    await uc.execute({ allocationId: 'alloc-1', poolId: 'pool-1', amount: 1.5, destination: 'dest' });

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('LIQUIDITY_ALLOCATED');
  });

  it('should reject allocation from critical pool', async () => {
    const repo = new InMemoryLiquidityPoolRepository();
    const now = new Date();
    const pool = new LiquidityPool('pool-1', Amount.btc(10), Amount.btc(0), 'critical', now, now);
    await repo.save(pool);

    const publisher = { publish: async () => {} };
    const clock = { now: () => new Date() };

    const uc = new AllocateLiquidityUseCase(repo, publisher, clock);
    await expect(uc.execute({ allocationId: 'a', poolId: 'pool-1', amount: 1, destination: 'd' })).rejects.toThrow();
  });
});
