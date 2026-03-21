export interface ObligationRecord { id: string; poolId: string; amount: number; status: string; createdAt: string; resolvedAt: string | null; }

export class ObligationMapper {
  static toRecord(o: { id: { value: string }; poolId: string; amount: { toBtc(): number }; status: string; createdAt: Date; resolvedAt: Date | null }): ObligationRecord {
    return { id: o.id.value, poolId: o.poolId, amount: o.amount.toBtc(), status: o.status, createdAt: o.createdAt.toISOString(), resolvedAt: o.resolvedAt?.toISOString() ?? null };
  }
}
