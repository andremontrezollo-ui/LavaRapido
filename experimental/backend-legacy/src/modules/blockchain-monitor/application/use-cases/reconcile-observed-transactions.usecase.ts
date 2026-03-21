/**
 * ReconcileObservedTransactions Use Case
 */

import type { ObservedTransactionRepository } from '../ports/observed-transaction-repository.port';
import type { BlockchainSource } from '../ports/blockchain-source.port';
import type { BlockchainEventPublisher } from '../ports/event-publisher.port';
import type { BlockchainClock } from '../ports/clock.port';
import { ConfirmationCount } from '../../domain/value-objects/confirmation-count.vo';
import { ConfirmationThresholdPolicy } from '../../domain/policies/confirmation-threshold.policy';
import { createDepositConfirmedEvent } from '../../domain/events/deposit-confirmed.event';

export class ReconcileObservedTransactionsUseCase {
  private readonly policy = new ConfirmationThresholdPolicy();

  constructor(
    private readonly repo: ObservedTransactionRepository,
    private readonly source: BlockchainSource,
    private readonly publisher: BlockchainEventPublisher,
    private readonly clock: BlockchainClock,
  ) {}

  async execute(): Promise<number> {
    const pending = await this.repo.findPending();
    let reconciled = 0;

    for (const tx of pending) {
      const confirmations = await this.source.getTransactionConfirmations(tx.txId.value);
      if (confirmations === null) continue;

      const now = this.clock.now();
      tx.updateConfirmations(ConfirmationCount.create(confirmations), now);

      const result = this.policy.evaluate({ confirmations, amount: tx.amount });
      if (result.isConfirmed && tx.status !== 'confirmed') {
        tx.markConfirmed(now);
        await this.publisher.publish(createDepositConfirmedEvent(tx.txId.value, confirmations));
      }

      await this.repo.save(tx);
      reconciled++;
    }

    return reconciled;
  }
}
