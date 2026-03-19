import { describe, it, expect } from 'vitest';
import { GetMixSessionStatusUseCase } from '../application/use-cases/get-mix-session-status.usecase';
import { InMemoryMixSessionRepository } from '../infra/repositories/mix-session.repository';
import { MixSession } from '../domain/entities/mix-session.entity';

describe('GetMixSessionStatusUseCase', () => {
  function makeSession(opts: { expired: boolean; status?: 'active' | 'expired' }) {
    const now = new Date();
    const expiresAt = opts.expired
      ? new Date(now.getTime() - 1000)
      : new Date(now.getTime() + 30 * 60 * 1000);

    return new MixSession({
      id: 'session-1',
      depositAddress: 'tb1qabc123',
      clientFingerprintHash: 'hash123',
      createdAt: new Date(now.getTime() - 60_000),
      expiresAt,
      status: opts.status ?? 'active',
    });
  }

  function makeUseCase(session?: MixSession) {
    const repo = new InMemoryMixSessionRepository();
    if (session) repo.save(session);
    const events: unknown[] = [];
    const publisher = { publish: async (e: unknown) => { events.push(e); } };
    const clock = { now: () => new Date() };
    const uc = new GetMixSessionStatusUseCase(repo, clock, publisher);
    return { uc, events };
  }

  it('should return active status for a valid session', async () => {
    const { uc, events } = makeUseCase(makeSession({ expired: false }));
    const result = await uc.execute({ sessionId: 'session-1' });

    expect(result).not.toBeNull();
    expect(result!.status).toBe('active');
    expect(events).toHaveLength(0);
  });

  it('should lazily mark a session as expired when past its expiry time', async () => {
    const { uc, events } = makeUseCase(makeSession({ expired: true }));
    const result = await uc.execute({ sessionId: 'session-1' });

    expect(result).not.toBeNull();
    expect(result!.status).toBe('expired');
    expect(events).toHaveLength(1);
    expect((events[0] as any).type).toBe('SESSION_EXPIRED');
  });

  it('should not emit a second event when session is already expired', async () => {
    const { uc, events } = makeUseCase(makeSession({ expired: true, status: 'expired' }));
    const result = await uc.execute({ sessionId: 'session-1' });

    expect(result!.status).toBe('expired');
    expect(events).toHaveLength(0);
  });

  it('should return null for a non-existent session', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ sessionId: 'does-not-exist' });

    expect(result).toBeNull();
  });
});
