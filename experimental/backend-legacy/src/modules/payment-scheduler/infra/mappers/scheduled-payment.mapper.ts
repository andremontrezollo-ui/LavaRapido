export interface ScheduledPaymentRecord { id: string; destination: string; amount: number; status: string; scheduledFor: string; createdAt: string; executedAt: string | null; }

export class ScheduledPaymentMapper {
  static toRecord(p: { id: { value: string }; destination: { address: string }; amount: number; status: string; scheduledFor: { value: Date }; createdAt: Date; executedAt: Date | null }): ScheduledPaymentRecord {
    return { id: p.id.value, destination: p.destination.address, amount: p.amount, status: p.status, scheduledFor: p.scheduledFor.value.toISOString(), createdAt: p.createdAt.toISOString(), executedAt: p.executedAt?.toISOString() ?? null };
  }
}
