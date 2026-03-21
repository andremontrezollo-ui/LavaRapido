/**
 * TransactionStatus DTO
 */

export interface TransactionStatusDto {
  readonly txId: string;
  readonly status: 'pending' | 'confirmed' | 'dropped' | 'reorged';
  readonly confirmations: number;
  readonly blockHeight: number;
  readonly firstSeen: string;
  readonly lastUpdated: string;
}
