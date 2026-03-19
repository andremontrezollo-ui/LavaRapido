import type { MixSessionRepository } from '../../application/ports/mix-session-repository.port';
import type { MixSession } from '../../domain/entities/mix-session.entity';

export class InMemoryMixSessionRepository implements MixSessionRepository {
  private store = new Map<string, MixSession>();

  async findById(id: string): Promise<MixSession | null> {
    return this.store.get(id) ?? null;
  }

  async save(session: MixSession): Promise<void> {
    this.store.set(session.id, session);
  }

  async findActiveExpired(now: Date): Promise<MixSession[]> {
    return Array.from(this.store.values()).filter(
      (s) => s.status === 'active' && now >= s.expiresAt,
    );
  }
}
