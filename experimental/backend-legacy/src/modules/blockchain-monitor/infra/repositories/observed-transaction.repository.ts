/**
 * In-Memory ObservedTransaction Repository
 */

import type { ObservedTransactionRepository } from '../../application/ports/observed-transaction-repository.port';
import type { ObservedTransaction } from '../../domain/entities/observed-transaction.entity';

export class InMemoryObservedTransactionRepository implements ObservedTransactionRepository {
  private store = new Map<string, ObservedTransaction>();

  async findById(id: string): Promise<ObservedTransaction | null> {
    return this.store.get(id) ?? null;
  }

  async findByTxId(txId: string): Promise<ObservedTransaction | null> {
    for (const tx of this.store.values()) {
      if (tx.txId.value === txId) return tx;
    }
    return null;
  }

  async findPending(): Promise<ObservedTransaction[]> {
    return Array.from(this.store.values()).filter(tx => tx.status === 'pending');
  }

  async save(tx: ObservedTransaction): Promise<void> {
    this.store.set(tx.id, tx);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
