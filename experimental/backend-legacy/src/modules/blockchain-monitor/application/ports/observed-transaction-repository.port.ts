/**
 * ObservedTransactionRepository Port
 */

import type { ObservedTransaction } from '../../domain/entities/observed-transaction.entity';

export interface ObservedTransactionRepository {
  findById(id: string): Promise<ObservedTransaction | null>;
  findByTxId(txId: string): Promise<ObservedTransaction | null>;
  findPending(): Promise<ObservedTransaction[]>;
  save(tx: ObservedTransaction): Promise<void>;
  delete(id: string): Promise<void>;
}
