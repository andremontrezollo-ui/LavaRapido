/**
 * Supabase implementation of RateLimitRepositoryPort.
 */

import type { SupabaseClient } from "./supabase-client.factory.ts";
import type { RateLimitRepositoryPort } from "../../../../backend/src/shared/ports/RateLimitRepository.ts";

export class SupabaseRateLimitRepository implements RateLimitRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async countRequests(ipHash: string, endpoint: string, windowSeconds: number): Promise<number> {
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();
    const { count } = await this.supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("endpoint", endpoint)
      .gte("created_at", windowStart);

    return count ?? 0;
  }

  async record(ipHash: string, endpoint: string): Promise<void> {
    await this.supabase.from("rate_limits").insert({ ip_hash: ipHash, endpoint });
  }

  async deleteOlderThan(cutoffIso: string): Promise<number> {
    const { count } = await this.supabase
      .from("rate_limits")
      .delete()
      .lt("created_at", cutoffIso)
      .select("*", { count: "exact", head: true });

    return count ?? 0;
  }
}
