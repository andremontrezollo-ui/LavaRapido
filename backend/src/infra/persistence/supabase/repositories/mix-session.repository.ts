/**
 * SupabaseMixSessionRepository — Supabase implementation of MixSessionRepository.
 */
import type { MixSessionRepository, CreateMixSessionInput } from '../../../modules/mix-session/application/ports/mix-session-repository.port.ts';
import { MixSession } from '../../../modules/mix-session/domain/entities/mix-session.entity.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export class SupabaseMixSessionRepository implements MixSessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateMixSessionInput): Promise<MixSession> {
    const { data, error } = await this.client
      .from('mix_sessions')
      .insert({
        deposit_address: input.depositAddress,
        status: input.status,
        expires_at: input.expiresAt.toISOString(),
        client_fingerprint_hash: input.clientFingerprintHash,
      })
      .select('id, deposit_address, status, created_at, expires_at, client_fingerprint_hash')
      .single();

    if (error || !data) throw new Error(`Failed to create session: ${error?.message}`);

    return new MixSession(
      data.id,
      data.deposit_address,
      data.status,
      new Date(data.created_at),
      new Date(data.expires_at),
      data.client_fingerprint_hash ?? '',
    );
  }

  async findById(id: string): Promise<MixSession | null> {
    const { data, error } = await this.client
      .from('mix_sessions')
      .select('id, deposit_address, status, created_at, expires_at, client_fingerprint_hash')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return new MixSession(
      data.id,
      data.deposit_address,
      data.status,
      new Date(data.created_at),
      new Date(data.expires_at),
      data.client_fingerprint_hash ?? '',
    );
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.client.from('mix_sessions').update({ status }).eq('id', id);
  }

  async markExpiredSessions(now: Date): Promise<number> {
    const { count } = await this.client
      .from('mix_sessions')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expires_at', now.toISOString())
      .select('*', { count: 'exact', head: true });

    return count ?? 0;
  }
}
