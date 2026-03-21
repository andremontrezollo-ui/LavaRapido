import type { ScheduledPaymentRepository } from '../ports/scheduled-payment-repository.port';
import type { PaymentEventPublisher } from '../ports/event-publisher.port';
import type { PaymentClock } from '../ports/clock.port';
import { createPaymentCancelledEvent } from '../../domain/events/payment-cancelled.event';

export class CancelScheduledPaymentUseCase {
  constructor(
    private readonly repo: ScheduledPaymentRepository,
    private readonly publisher: PaymentEventPublisher,
    private readonly clock: PaymentClock,
  ) {}

  async execute(paymentId: string, reason: string): Promise<void> {
    const payment = await this.repo.findById(paymentId);
    if (!payment) throw new Error(`Payment ${paymentId} not found`);
    if (payment.status === 'executed') throw new Error('Cannot cancel executed payment');

    payment.markCancelled(this.clock.now());
    await this.repo.save(payment);
    await this.publisher.publish(createPaymentCancelledEvent(paymentId, reason));
  }
}
