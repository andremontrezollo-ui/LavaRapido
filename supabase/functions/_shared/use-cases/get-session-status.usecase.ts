/**
 * Use Case: GetSessionStatus
 *
 * Responsibilities:
 * - Validate session ID format
 * - Look up session in repository
 * - Determine whether session is expired
 * - Persist updated status if session newly expired
 *
 * Does NOT know about HTTP, Supabase client, or Deno.serve.
 */

import type { MixSessionRepository } from "../ports/mix-session-repository.port.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GetSessionStatusResult =
  | { found: false }
  | {
      found: true;
      session: {
        sessionId: string;
        status: string;
        expiresAt: string;
        createdAt: string;
      };
    };

export function isValidSessionId(id: string): boolean {
  return UUID_RE.test(id);
}

export async function getSessionStatusUseCase(
  sessionId: string,
  sessionRepo: MixSessionRepository,
): Promise<GetSessionStatusResult> {
  const record = await sessionRepo.findById(sessionId);
  if (!record) return { found: false };

  const isExpired = new Date(record.expires_at) < new Date();
  const status = isExpired ? "expired" : record.status;

  if (isExpired && record.status !== "expired") {
    await sessionRepo.updateStatus(sessionId, "expired");
  }

  return {
    found: true,
    session: {
      sessionId: record.id,
      status,
      expiresAt: record.expires_at,
      createdAt: record.created_at,
    },
  };
}
