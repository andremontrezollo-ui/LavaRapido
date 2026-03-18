import type { MixSession } from '../../domain/entities/mix-session.entity.ts';

/**
 * MixSessionRepository — port (interface) for persistence of MixSession aggregates.
 *
 * Concrete implementations live in infra/ (e.g. SupabaseMixSessionRepository).
 */

/** Input type for creating a new session (id is DB-generated). */
export interface CreateMixSessionInput {
  depositAddress: string;
  status: string;
  createdAt: Date;
  expiresAt: Date;
  clientFingerprintHash: string;
}

export interface MixSessionRepository {
  /** Persist a new session. Returns the saved session with DB-generated id. */
  create(input: CreateMixSessionInput): Promise<MixSession>;

  /** Find a session by its primary key. Returns null when not found. */
  findById(id: string): Promise<MixSession | null>;

  /** Update the status of an existing session. */
  updateStatus(id: string, status: string): Promise<void>;

  /**
   * Bulk-mark all active sessions whose expires_at < now as "expired".
   * Returns the count of updated rows.
   */
  markExpiredSessions(now: Date): Promise<number>;
}
