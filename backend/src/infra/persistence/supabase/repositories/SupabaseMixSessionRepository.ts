/**
 * SupabaseMixSessionRepository — Node.js implementation.
 *
 * Implements MixSessionRepository using the Supabase JS client (Node.js).
 * Mirrors the schema of the `mix_sessions` table.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MixSession, MixSessionStatus } from '../../../../modules/mix-session/domain/MixSession.ts';
import type { MixSessionRepository } from '../../../../modules/mix-session/application/ports/MixSessionRepository.ts';

interface MixSessionRow {
  id: string;
  deposit_address: string;
  status: MixSessionStatus;
  expires_at: string;
  created_at: string;
  client_fingerprint_hash: string;
}

function rowToEntity(row: MixSessionRow): MixSession {
  return {
    id: row.id,
    depositAddress: row.deposit_address,
    status: row.status,
    expiresAt: new Date(row.expires_at),
    createdAt: new Date(row.created_at),
    clientFingerprintHash: row.client_fingerprint_hash,
  };
}

export class SupabaseMixSessionRepository implements MixSessionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(session: Omit<MixSession, 'id'> & { id?: string }): Promise<MixSession> {
    const payload: Record<string, unknown> = {
      deposit_address: session.depositAddress,
      status: session.status,
      expires_at: session.expiresAt.toISOString(),
      client_fingerprint_hash: session.clientFingerprintHash,
    };
    if (session.id) payload.id = session.id;

    const { data, error } = await this.supabase
      .from('mix_sessions')
      .insert(payload)
      .select('id, deposit_address, status, expires_at, created_at, client_fingerprint_hash')
      .single();

    if (error || !data) throw new Error(`Failed to save mix session: ${error?.message}`);
    return rowToEntity(data as MixSessionRow);
  }

  async findById(id: string): Promise<MixSession | null> {
    const { data, error } = await this.supabase
      .from('mix_sessions')
      .select('id, deposit_address, status, expires_at, created_at, client_fingerprint_hash')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return rowToEntity(data as MixSessionRow);
  }

  async updateStatus(id: string, status: MixSessionStatus): Promise<void> {
    const { error } = await this.supabase
      .from('mix_sessions')
      .update({ status })
      .eq('id', id);

    if (error) throw new Error(`Failed to update session status: ${error.message}`);
  }

  async markExpiredBefore(now: Date): Promise<number> {
    const { data, error } = await this.supabase
      .from('mix_sessions')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expires_at', now.toISOString())
      .select('id');

    if (error) throw new Error(`Failed to mark expired sessions: ${error.message}`);
    return data?.length ?? 0;
  }
}
