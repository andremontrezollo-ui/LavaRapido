/**
 * Adapter: SupabaseRateLimitRepository
 * Concrete Supabase implementation of RateLimitRepository.
 * Replaces the inline rate-limiter.ts functions with a proper port/adapter.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { RateLimitRepository } from "../ports/rate-limit-repository.port.ts";

export function createSupabaseRateLimitRepository(
  supabase: ReturnType<typeof createClient>,
): RateLimitRepository {
  return {
    async count(ipHash: string, endpoint: string, windowStart: string): Promise<number> {
      const { count } = await supabase
        .from("rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .eq("endpoint", endpoint)
        .gte("created_at", windowStart);

      return count ?? 0;
    },

    async record(ipHash: string, endpoint: string): Promise<void> {
      await supabase.from("rate_limits").insert({ ip_hash: ipHash, endpoint });
    },

    async deleteOlderThan(before: string): Promise<number> {
      const { count } = await supabase
        .from("rate_limits")
        .delete()
        .lt("created_at", before)
        .select("*", { count: "exact", head: true });

      return count ?? 0;
    },
  };
}
