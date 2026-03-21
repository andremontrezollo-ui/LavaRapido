/**
 * GetTransactionStatus Use Case
 */

import type { ObservedTransactionRepository } from '../ports/observed-transaction-repository.port';
import type { TransactionStatusDto } from '../dtos/transaction-status.dto';

export class GetTransactionStatusUseCase {
  constructor(private readonly repo: ObservedTransactionRepository) {}

  async execute(txId: string): Promise<TransactionStatusDto | null> {
    const tx = await this.repo.findByTxId(txId);
    if (!tx) return null;

    return {
      txId: tx.txId.value,
      status: tx.status,
      confirmations: tx.confirmations.count,
      blockHeight: tx.blockHeight.value,
      firstSeen: tx.firstSeen.toISOString(),
      lastUpdated: tx.lastUpdated.toISOString(),
    };
  }
}
