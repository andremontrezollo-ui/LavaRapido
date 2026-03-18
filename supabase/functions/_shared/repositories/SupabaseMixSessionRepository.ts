/**
 * SupabaseMixSessionRepository — Deno implementation.
 *
 * Implements the MixSessionRepository port using the Supabase Deno client.
 * Imported by Edge Functions that need to persist mix sessions.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { MixSession, MixSessionStatus } from "../../../backend/src/modules/mix-session/domain/MixSession.ts";
import type { MixSessionRepository } from "../../../backend/src/modules/mix-session/application/ports/MixSessionRepository.ts";

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
  private readonly supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  async save(session: Omit<MixSession, "id"> & { id?: string }): Promise<MixSession> {
    const payload: Record<string, unknown> = {
      deposit_address: session.depositAddress,
      status: session.status,
      expires_at: session.expiresAt.toISOString(),
      client_fingerprint_hash: session.clientFingerprintHash,
    };
    if (session.id) payload.id = session.id;

    const { data, error } = await this.supabase
      .from("mix_sessions")
      .insert(payload)
      .select("id, deposit_address, status, expires_at, created_at, client_fingerprint_hash")
      .single();

    if (error || !data) throw new Error(`Failed to save mix session: ${error?.message}`);
    return rowToEntity(data as MixSessionRow);
  }

  async findById(id: string): Promise<MixSession | null> {
    const { data, error } = await this.supabase
      .from("mix_sessions")
      .select("id, deposit_address, status, expires_at, created_at, client_fingerprint_hash")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return rowToEntity(data as MixSessionRow);
  }

  async updateStatus(id: string, status: MixSessionStatus): Promise<void> {
    const { error } = await this.supabase
      .from("mix_sessions")
      .update({ status })
      .eq("id", id);

    if (error) throw new Error(`Failed to update session status: ${error.message}`);
  }

  async markExpiredBefore(now: Date): Promise<number> {
    const { count, error } = await this.supabase
      .from("mix_sessions")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", now.toISOString())
      .select("*", { count: "exact", head: true });

    if (error) throw new Error(`Failed to mark expired sessions: ${error.message}`);
    return count ?? 0;
  }
}
