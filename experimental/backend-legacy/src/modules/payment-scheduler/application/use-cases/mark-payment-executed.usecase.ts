/**
 * MarkPaymentExecuted Use Case — with idempotency and distributed lock.
 */

import type { ScheduledPaymentRepository } from '../ports/scheduled-payment-repository.port';
import type { PaymentEventPublisher } from '../ports/event-publisher.port';
import type { PaymentClock } from '../ports/clock.port';
import type { IdempotencyStore } from '../../../../shared/policies/idempotency-policy';
import type { DistributedLock } from '../../../../shared/ports/DistributedLock';
import { createPaymentExecutedEvent } from '../../domain/events/payment-executed.event';
import { PaymentAlreadyExecutedError } from '../../domain/errors/payment-already-executed.error';
import { IdempotencyGuard } from '../../../../shared/policies/idempotency-policy';

export class MarkPaymentExecutedUseCase {
  private readonly idempotencyGuard: IdempotencyGuard;

  constructor(
    private readonly repo: ScheduledPaymentRepository,
    private readonly publisher: PaymentEventPublisher,
    private readonly clock: PaymentClock,
    private readonly lock: DistributedLock,
    idempotencyStore: IdempotencyStore,
  ) {
    this.idempotencyGuard = new IdempotencyGuard(idempotencyStore, 7200);
  }

  async execute(paymentId: string, success: boolean): Promise<void> {
    const idempotencyKey = `execute-payment:${paymentId}`;

    await this.idempotencyGuard.executeOnce(idempotencyKey, async () => {
      const lockKey = `payment-exec:${paymentId}`;
      const acquired = await this.lock.acquire(lockKey, 30);
      if (!acquired) throw new Error('Payment execution locked by another process');

      try {
        const payment = await this.repo.findById(paymentId);
        if (!payment) throw new Error(`Payment ${paymentId} not found`);
        if (payment.status === 'executed') throw new PaymentAlreadyExecutedError(paymentId);

        if (success) {
          payment.markExecuted(this.clock.now());
        } else {
          payment.markFailed();
        }

        await this.repo.save(payment);
        await this.publisher.publish(createPaymentExecutedEvent(paymentId, success));
      } finally {
        await this.lock.release(lockKey);
      }
    });
  }
}
