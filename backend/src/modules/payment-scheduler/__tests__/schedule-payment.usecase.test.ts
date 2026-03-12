import { describe, it, expect } from 'vitest';
import { SchedulePaymentUseCase } from '../application/use-cases/schedule-payment.usecase';
import { InMemoryScheduledPaymentRepository } from '../infra/repositories/scheduled-payment.repository';
import type { IdempotencyStore, IdempotencyRecord } from '../../../shared/policies/idempotency-policy';

function makeIdempotencyStore(): IdempotencyStore {
  const map = new Map<string, IdempotencyRecord>();
  return {
    async get(key) { return map.get(key) ?? null; },
    async save(record) { map.set(record.key, record); },
    async exists(key) { return map.has(key); },
    async deleteExpired() { return 0; },
  };
}

describe('SchedulePaymentUseCase', () => {
  it('should schedule a payment', async () => {
    const repo = new InMemoryScheduledPaymentRepository();
    const events: any[] = [];
    const publisher = { publish: async (e: any) => { events.push(e); } };
    const clock = { now: () => new Date() };
    const idGen = { generate: () => 'pay-001' };

    const uc = new SchedulePaymentUseCase(repo, publisher, clock, idGen, makeIdempotencyStore());
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

  it('should return same result on duplicate request (idempotency)', async () => {
    const repo = new InMemoryScheduledPaymentRepository();
    const events: any[] = [];
    const publisher = { publish: async (e: any) => { events.push(e); } };
    const clock = { now: () => new Date('2025-01-01T00:00:00Z') };
    const idGen = { generate: () => 'pay-002' };
    const store = makeIdempotencyStore();

    const uc = new SchedulePaymentUseCase(repo, publisher, clock, idGen, store);
    const req = { destination: 'bc1qtest12345678901234567890', amount: 0.5, delaySeconds: 600 };

    const first = await uc.execute(req);
    const second = await uc.execute(req);

    expect(first.paymentId).toBe(second.paymentId);
    expect(events.length).toBe(1); // only one event emitted
  });
});
