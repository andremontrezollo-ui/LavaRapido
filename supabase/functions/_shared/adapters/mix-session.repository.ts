/**
 * Supabase implementation of MixSessionRepositoryPort.
 */

import type { SupabaseClient } from "./supabase-client.factory.ts";
import type { MixSessionRepositoryPort } from "../../../../backend/src/modules/mix-session/application/ports/mix-session-repository.port.ts";
import type { MixSession, SessionStatus } from "../../../../backend/src/modules/mix-session/domain/entities/mix-session.entity.ts";

export class SupabaseMixSessionRepository implements MixSessionRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(params: {
    id: string;
    depositAddress: string;
    status: SessionStatus;
    expiresAt: Date;
    clientFingerprintHash: string;
  }): Promise<MixSession> {
    const { data, error } = await this.supabase
      .from("mix_sessions")
      .insert({
        id: params.id,
        deposit_address: params.depositAddress,
        status: params.status,
        expires_at: params.expiresAt.toISOString(),
        client_fingerprint_hash: params.clientFingerprintHash,
      })
      .select("id, deposit_address, status, created_at, expires_at, client_fingerprint_hash")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create session");

    return this.#map(data);
  }

  async findById(id: string): Promise<MixSession | null> {
    const { data, error } = await this.supabase
      .from("mix_sessions")
      .select("id, deposit_address, status, created_at, expires_at, client_fingerprint_hash")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.#map(data);
  }

  async updateStatus(id: string, status: SessionStatus): Promise<void> {
    await this.supabase
      .from("mix_sessions")
      .update({ status })
      .eq("id", id);
  }

  #map(row: Record<string, unknown>): MixSession {
    return {
      id: row.id as string,
      depositAddress: row.deposit_address as string,
      status: row.status as SessionStatus,
      createdAt: new Date(row.created_at as string),
      expiresAt: new Date(row.expires_at as string),
      clientFingerprintHash: row.client_fingerprint_hash as string,
    };
  }
}
