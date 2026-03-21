import { describe, it, expect } from 'vitest';
import { ConfirmDepositUseCase } from '../application/use-cases/confirm-deposit.usecase';
import { InMemoryObservedTransactionRepository } from '../infra/repositories/observed-transaction.repository';
import { ObservedTransaction } from '../domain/entities/observed-transaction.entity';
import { TxId } from '../domain/value-objects/txid.vo';
import { ConfirmationCount } from '../domain/value-objects/confirmation-count.vo';
import { BlockHeight } from '../domain/value-objects/block-height.vo';

describe('ConfirmDepositUseCase', () => {
  const txHash = 'a'.repeat(64);

  function makeRepo() {
    const repo = new InMemoryObservedTransactionRepository();
    const now = new Date();
    const tx = new ObservedTransaction('1', TxId.create(txHash), 'bc1qtest', 0.05, ConfirmationCount.create(0), BlockHeight.create(800000), 'pending', now, now);
    repo.save(tx);
    return repo;
  }

  it('should confirm deposit when threshold met', async () => {
    const repo = makeRepo();
    const events: any[] = [];
    const publisher = { publish: async (e: any) => { events.push(e); } };
    const clock = { now: () => new Date() };

    const uc = new ConfirmDepositUseCase(repo, publisher, clock);
    const result = await uc.execute(txHash, 6);

    expect(result.isConfirmed).toBe(true);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('DEPOSIT_CONFIRMED');
  });

  it('should not confirm when below threshold', async () => {
    const repo = makeRepo();
    const events: any[] = [];
    const publisher = { publish: async (e: any) => { events.push(e); } };
    const clock = { now: () => new Date() };

    const uc = new ConfirmDepositUseCase(repo, publisher, clock);
    const result = await uc.execute(txHash, 2);

    expect(result.isConfirmed).toBe(false);
    expect(events.length).toBe(0);
  });
});
