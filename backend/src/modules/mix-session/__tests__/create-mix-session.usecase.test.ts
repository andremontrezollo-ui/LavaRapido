import { describe, it, expect } from 'vitest';
import { CreateMixSessionUseCase } from '../application/use-cases/create-mix-session.usecase';
import { InMemoryMixSessionRepository } from '../infra/repositories/mix-session.repository';
import { MockTestnetAddressGenerator } from '../infra/adapters/mock-address-generator.adapter';

describe('CreateMixSessionUseCase', () => {
  function makeUseCase(nowOverride?: Date) {
    const repo = new InMemoryMixSessionRepository();
    const events: unknown[] = [];
    const publisher = { publish: async (e: unknown) => { events.push(e); } };
    const clock = { now: () => nowOverride ?? new Date() };
    const addressGenerator = new MockTestnetAddressGenerator();
    const uc = new CreateMixSessionUseCase(repo, addressGenerator, clock, publisher);
    return { uc, repo, events };
  }

  it('should create a mix session with active status', async () => {
    const { uc, events } = makeUseCase();
    const result = await uc.execute({ clientFingerprintHash: 'abc123' });

    expect(result.status).toBe('active');
    expect(result.sessionId).toBeDefined();
    expect(result.depositAddress).toMatch(/^tb1q/);
    expect(events).toHaveLength(1);
    expect((events[0] as any).type).toBe('SESSION_CREATED');
  });

  it('should set expiration 30 minutes from creation', async () => {
    const baseTime = new Date('2026-01-01T00:00:00Z');
    const { uc } = makeUseCase(baseTime);

    const result = await uc.execute({ clientFingerprintHash: 'abc123' });

    const expectedExpiry = new Date('2026-01-01T00:30:00Z');
    expect(new Date(result.expiresAt).getTime()).toBe(expectedExpiry.getTime());
  });

  it('should persist the session in the repository', async () => {
    const { uc, repo } = makeUseCase();
    const result = await uc.execute({ clientFingerprintHash: 'abc123' });

    const saved = await repo.findById(result.sessionId);
    expect(saved).not.toBeNull();
    expect(saved!.depositAddress).toBe(result.depositAddress);
  });
});
