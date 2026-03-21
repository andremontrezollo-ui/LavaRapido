import type { ScheduledPaymentRepository } from '../ports/scheduled-payment-repository.port';
import { ExecutionTime } from '../../domain/value-objects/execution-time.vo';

export class ReschedulePaymentUseCase {
  constructor(private readonly repo: ScheduledPaymentRepository) {}

  async execute(paymentId: string, newScheduledFor: Date): Promise<void> {
    const payment = await this.repo.findById(paymentId);
    if (!payment) throw new Error(`Payment ${paymentId} not found`);

    payment.reschedule(ExecutionTime.create(newScheduledFor));
    await this.repo.save(payment);
  }
}
