/**
 * MixSessionRepository — port (interface) for mix-session persistence.
 *
 * Use cases depend on this abstraction.
 * Concrete implementations live in infra/persistence/supabase/.
 */

import type { MixSession, MixSessionStatus } from '../../domain/MixSession.ts';

export interface MixSessionRepository {
  /**
   * Persist a new session.
   * The implementation assigns the `id` field if not provided.
   */
  save(session: Omit<MixSession, 'id'> & { id?: string }): Promise<MixSession>;

  /** Look up a session by its UUID. Returns null if not found. */
  findById(id: string): Promise<MixSession | null>;

  /** Update the status of an existing session. */
  updateStatus(id: string, status: MixSessionStatus): Promise<void>;

  /**
   * Mark all sessions with status 'active' and expires_at < now as 'expired'.
   * Returns the number of sessions updated.
   */
  markExpiredBefore(now: Date): Promise<number>;
}
