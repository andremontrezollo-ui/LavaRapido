/**
 * Use Case: RunCleanup
 *
 * Responsibilities:
 * - Mark all expired mix_sessions as "expired"
 * - Delete rate_limit records older than the retention window
 *
 * Does NOT know about HTTP, Supabase client, or Deno.serve.
 */

import type { MixSessionRepository } from "../ports/mix-session-repository.port.ts";
import type { RateLimitRepository } from "../ports/rate-limit-repository.port.ts";

const RATE_LIMIT_RETENTION_MS = 60 * 60 * 1000; // 1 hour

export interface CleanupResult {
  expiredSessions: number;
  deletedRateLimits: number;
}

export async function runCleanupUseCase(
  sessionRepo: MixSessionRepository,
  rateLimitRepo: RateLimitRepository,
): Promise<CleanupResult> {
  const now = new Date().toISOString();
  const expiredSessions = await sessionRepo.markExpiredSessions(now);

  const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_RETENTION_MS).toISOString();
  const deletedRateLimits = await rateLimitRepo.deleteOlderThan(rateLimitCutoff);

  return { expiredSessions, deletedRateLimits };
}
