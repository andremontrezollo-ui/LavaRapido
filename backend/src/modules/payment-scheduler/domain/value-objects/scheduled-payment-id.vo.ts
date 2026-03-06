export class ScheduledPaymentId {
  private constructor(readonly value: string) {}
  static create(id: string): ScheduledPaymentId {
    if (!id) throw new Error('ScheduledPaymentId cannot be empty');
    return new ScheduledPaymentId(id);
  }
  equals(other: ScheduledPaymentId): boolean { return this.value === other.value; }
}
