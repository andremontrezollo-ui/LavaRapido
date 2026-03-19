/**
 * Adapter: SupabaseMixSessionRepository
 * Concrete Supabase implementation of MixSessionRepository.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  MixSessionRepository,
  MixSessionRecord,
  CreateMixSessionParams,
} from "../ports/mix-session-repository.port.ts";

export function createSupabaseMixSessionRepository(
  supabase: ReturnType<typeof createClient>,
): MixSessionRepository {
  return {
    async create(params: CreateMixSessionParams): Promise<MixSessionRecord> {
      const { data, error } = await supabase
        .from("mix_sessions")
        .insert({
          deposit_address: params.depositAddress,
          status: "active",
          expires_at: params.expiresAt,
          client_fingerprint_hash: params.clientFingerprintHash,
        })
        .select("id, deposit_address, created_at, expires_at, status")
        .single();

      if (error || !data) throw new Error("DB error creating mix session");
      return data as MixSessionRecord;
    },

    async findById(id: string): Promise<MixSessionRecord | null> {
      const { data, error } = await supabase
        .from("mix_sessions")
        .select("id, status, expires_at, created_at")
        .eq("id", id)
        .single();

      if (error || !data) return null;
      return data as MixSessionRecord;
    },

    async updateStatus(id: string, status: string): Promise<void> {
      await supabase.from("mix_sessions").update({ status }).eq("id", id);
    },

    async markExpiredSessions(before: string): Promise<number> {
      const { count } = await supabase
        .from("mix_sessions")
        .update({ status: "expired" })
        .eq("status", "active")
        .lt("expires_at", before)
        .select("*", { count: "exact", head: true });

      return count ?? 0;
    },
  };
}
