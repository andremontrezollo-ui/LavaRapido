/**
 * Supabase implementation of CleanupRepositoryPort.
 */

import type { SupabaseClient } from "./supabase-client.factory.ts";
import type { CleanupRepositoryPort } from "../../../../backend/src/modules/cleanup/application/ports/cleanup-repository.port.ts";

export class SupabaseCleanupRepository implements CleanupRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async expireActiveSessions(nowIso: string): Promise<number> {
    const { count } = await this.supabase
      .from("mix_sessions")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", nowIso)
      .select("*", { count: "exact", head: true });

    return count ?? 0;
  }

  async deleteOldRateLimits(cutoffIso: string): Promise<number> {
    const { count } = await this.supabase
      .from("rate_limits")
      .delete()
      .lt("created_at", cutoffIso)
      .select("*", { count: "exact", head: true });

    return count ?? 0;
  }
}
