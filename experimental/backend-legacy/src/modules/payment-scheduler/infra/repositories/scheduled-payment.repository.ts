import type { ScheduledPaymentRepository } from '../../application/ports/scheduled-payment-repository.port';
import type { ScheduledPayment } from '../../domain/entities/scheduled-payment.entity';

export class InMemoryScheduledPaymentRepository implements ScheduledPaymentRepository {
  private store = new Map<string, ScheduledPayment>();

  async findById(id: string): Promise<ScheduledPayment | null> {
    for (const p of this.store.values()) {
      if (p.id.value === id) return p;
    }
    return null;
  }

  async findDue(now: Date): Promise<ScheduledPayment[]> {
    return Array.from(this.store.values()).filter(p => p.isDue(now));
  }

  async findAll(): Promise<ScheduledPayment[]> {
    return Array.from(this.store.values());
  }

  async save(payment: ScheduledPayment): Promise<void> {
    this.store.set(payment.id.value, payment);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
