import type { ScheduledPayment } from '../../domain/entities/scheduled-payment.entity';

export interface ScheduledPaymentRepository {
  findById(id: string): Promise<ScheduledPayment | null>;
  findDue(now: Date): Promise<ScheduledPayment[]>;
  findAll(): Promise<ScheduledPayment[]>;
  save(payment: ScheduledPayment): Promise<void>;
  delete(id: string): Promise<void>;
}
