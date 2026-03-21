import type { ScheduledPaymentRepository } from '../ports/scheduled-payment-repository.port';
import type { PaymentClock } from '../ports/clock.port';
import type { ScheduledPaymentDto } from '../dtos/scheduled-payment.dto';

export class GetDuePaymentsUseCase {
  constructor(
    private readonly repo: ScheduledPaymentRepository,
    private readonly clock: PaymentClock,
  ) {}

  async execute(): Promise<ScheduledPaymentDto[]> {
    const due = await this.repo.findDue(this.clock.now());
    return due.map(p => ({
      paymentId: p.id.value,
      destination: p.destination.address,
      amount: p.amount,
      status: p.status,
      scheduledFor: p.scheduledFor.value.toISOString(),
      createdAt: p.createdAt.toISOString(),
      executedAt: p.executedAt?.toISOString() ?? null,
    }));
  }
}
