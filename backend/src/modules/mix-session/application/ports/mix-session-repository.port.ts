/**
 * MixSessionRepository Port
 * Defines the persistence contract for mix sessions.
 */

import type { MixSession } from '../../domain/entities/mix-session.entity';

export interface CreateSessionData {
  id: string;
  depositAddress: string;
  depositAddressNetwork: 'testnet' | 'mainnet';
  status: string;
  clientFingerprintHash: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface MixSessionRepository {
  /** Persist a new session. */
  save(session: MixSession): Promise<void>;

  /** Find a session by its ID. Returns null if not found. */
  findById(id: string): Promise<MixSession | null>;

  /** Mark all active sessions past their expiry date as 'expired'. Returns the count updated. */
  markExpiredSessions(now: Date): Promise<number>;

  /** Mark a single session as expired. */
  updateStatusToExpired(id: string): Promise<void>;
}
