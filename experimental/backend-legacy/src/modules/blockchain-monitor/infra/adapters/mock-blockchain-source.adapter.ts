/**
 * Mock Blockchain Source Adapter
 */

import type { BlockchainSource } from '../../application/ports/blockchain-source.port';
import type { BlockchainEventDto } from '../../application/dtos/blockchain-event.dto';

export class MockBlockchainSource implements BlockchainSource {
  private blockHeight = 800000;
  private confirmations = new Map<string, number>();

  async poll(): Promise<BlockchainEventDto[]> {
    return [];
  }

  async getCurrentBlockHeight(): Promise<number> {
    return this.blockHeight;
  }

  async getTransactionConfirmations(txId: string): Promise<number | null> {
    return this.confirmations.get(txId) ?? null;
  }

  setBlockHeight(height: number): void {
    this.blockHeight = height;
  }

  setConfirmations(txId: string, count: number): void {
    this.confirmations.set(txId, count);
  }
}
