/**
 * BlockchainEvent DTO
 */

export interface BlockchainEventDto {
  readonly eventType: 'new_block' | 'new_transaction' | 'confirmation_update';
  readonly txId?: string;
  readonly address?: string;
  readonly amount?: number;
  readonly blockHeight?: number;
  readonly confirmations?: number;
  readonly rawData?: Record<string, unknown>;
}
