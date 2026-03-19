import type { MixSession, SessionStatus } from '../../domain/entities/mix-session.entity.ts';

export interface MixSessionRepositoryPort {
  create(params: {
    id: string;
    depositAddress: string;
    status: SessionStatus;
    expiresAt: Date;
    clientFingerprintHash: string;
  }): Promise<MixSession>;

  findById(id: string): Promise<MixSession | null>;

  updateStatus(id: string, status: SessionStatus): Promise<void>;
}
