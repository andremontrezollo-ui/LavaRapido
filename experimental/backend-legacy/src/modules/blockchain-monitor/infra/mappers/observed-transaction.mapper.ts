/**
 * ObservedTransaction Mapper
 */

export interface ObservedTransactionRecord {
  id: string;
  txId: string;
  address: string;
  amount: number;
  confirmations: number;
  blockHeight: number;
  status: string;
  firstSeen: string;
  lastUpdated: string;
}

export class ObservedTransactionMapper {
  static toRecord(entity: { id: string; txId: { value: string }; address: string; amount: number; confirmations: { count: number }; blockHeight: { value: number }; status: string; firstSeen: Date; lastUpdated: Date }): ObservedTransactionRecord {
    return {
      id: entity.id,
      txId: entity.txId.value,
      address: entity.address,
      amount: entity.amount,
      confirmations: entity.confirmations.count,
      blockHeight: entity.blockHeight.value,
      status: entity.status,
      firstSeen: entity.firstSeen.toISOString(),
      lastUpdated: entity.lastUpdated.toISOString(),
    };
  }
}
