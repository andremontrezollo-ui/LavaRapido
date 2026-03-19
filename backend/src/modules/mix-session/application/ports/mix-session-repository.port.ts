/**
 * Port: MixSessionRepository
 * Defines the persistence contract for mix sessions.
 * Implemented by infrastructure adapters (e.g. Supabase).
 */

import type { MixSession } from '../../domain/entities/mix-session.entity';

export interface CreateMixSessionParams {
  depositAddress: string;
  expiresAt: Date;
  clientFingerprintHash: string;
}

export interface MixSessionRepository {
  create(params: CreateMixSessionParams): Promise<MixSession>;
  findById(id: string): Promise<MixSession | null>;
  updateStatus(id: string, status: string): Promise<void>;
  markExpiredSessions(before: Date): Promise<number>;
}
