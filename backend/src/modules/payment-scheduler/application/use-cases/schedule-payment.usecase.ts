/**
 * SchedulePayment Use Case — with idempotency guard.
 */

import type { ScheduledPaymentRepository } from '../ports/scheduled-payment-repository.port';
import type { PaymentEventPublisher } from '../ports/event-publisher.port';
import type { PaymentClock } from '../ports/clock.port';
import type { SchedulePaymentRequest } from '../dtos/schedule-payment.request';
import type { ScheduledPaymentDto } from '../dtos/scheduled-payment.dto';
import type { IdempotencyStore } from '../../../../shared/policies/idempotency-policy';
import { ScheduledPayment } from '../../domain/entities/scheduled-payment.entity';
import { ScheduledPaymentId } from '../../domain/value-objects/scheduled-payment-id.vo';
import { DestinationReference } from '../../domain/value-objects/destination-reference.vo';
import { ExecutionTime } from '../../domain/value-objects/execution-time.vo';
import { PaymentDelayPolicy } from '../../domain/policies/payment-delay.policy';
import { createPaymentScheduledEvent } from '../../domain/events/payment-scheduled.event';
import { IdempotencyGuard } from '../../../../shared/policies/idempotency-policy';

export class SchedulePaymentUseCase {
  private readonly delayPolicy = new PaymentDelayPolicy();
  private readonly idempotencyGuard: IdempotencyGuard;

  constructor(
    private readonly repo: ScheduledPaymentRepository,
    private readonly publisher: PaymentEventPublisher,
    private readonly clock: PaymentClock,
    private readonly idGenerator: { generate(): string },
    idempotencyStore: IdempotencyStore,
  ) {
    this.idempotencyGuard = new IdempotencyGuard(idempotencyStore, 3600);
  }

  async execute(req: SchedulePaymentRequest): Promise<ScheduledPaymentDto> {
    const idempotencyKey = `schedule:${req.destination}:${req.amount}:${req.delaySeconds}`;

    return this.idempotencyGuard.executeOnce(idempotencyKey, async () => {
      const now = this.clock.now();
      const delay = this.delayPolicy.evaluate({ amount: req.amount, requestedDelaySeconds: req.delaySeconds });
      const scheduledFor = new Date(now.getTime() + delay.actualDelaySeconds * 1000);
      const id = this.idGenerator.generate();

      const payment = new ScheduledPayment(
        ScheduledPaymentId.create(id),
        DestinationReference.create(req.destination, req.label),
        req.amount,
        ExecutionTime.create(scheduledFor),
        'scheduled',
        now,
      );

      await this.repo.save(payment);
      await this.publisher.publish(createPaymentScheduledEvent(id, scheduledFor));

      return {
        paymentId: id,
        destination: req.destination,
        amount: req.amount,
        status: 'scheduled' as const,
        scheduledFor: scheduledFor.toISOString(),
        createdAt: now.toISOString(),
        executedAt: null,
      };
    });
  }
}
