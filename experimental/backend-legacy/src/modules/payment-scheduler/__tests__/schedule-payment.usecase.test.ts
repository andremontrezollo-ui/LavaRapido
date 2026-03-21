import { describe, it, expect } from 'vitest';
import { SchedulePaymentUseCase } from '../application/use-cases/schedule-payment.usecase';
import { InMemoryScheduledPaymentRepository } from '../infra/repositories/scheduled-payment.repository';

describe('SchedulePaymentUseCase', () => {
  it('should schedule a payment', async () => {
    const repo = new InMemoryScheduledPaymentRepository();
    const events: any[] = [];
    const publisher = { publish: async (e: any) => { events.push(e); } };
    const clock = { now: () => new Date() };
    const idGen = { generate: () => 'pay-001' };

    const uc = new SchedulePaymentUseCase(repo, publisher, clock, idGen);
    const result = await uc.execute({
      destination: 'bc1qtest12345678901234567890',
      amount: 0.5,
      delaySeconds: 600,
    });

    expect(result.paymentId).toBe('pay-001');
    expect(result.status).toBe('scheduled');
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('PAYMENT_SCHEDULED');
  });
});
