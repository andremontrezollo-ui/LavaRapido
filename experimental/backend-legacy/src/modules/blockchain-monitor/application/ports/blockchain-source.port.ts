/**
 * BlockchainSource Port
 */

import type { BlockchainEventDto } from '../dtos/blockchain-event.dto';

export interface BlockchainSource {
  poll(): Promise<BlockchainEventDto[]>;
  getCurrentBlockHeight(): Promise<number>;
  getTransactionConfirmations(txId: string): Promise<number | null>;
}
