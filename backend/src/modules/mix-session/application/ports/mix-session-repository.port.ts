import type { MixSession } from '../../domain/entities/mix-session.entity';

export interface MixSessionRepository {
  save(session: MixSession): Promise<void>;
  findById(id: string): Promise<MixSession | null>;
  findActiveExpired(now: Date): Promise<MixSession[]>;
}
