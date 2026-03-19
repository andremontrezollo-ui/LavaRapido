/**
 * Use Case: CreateMixSession
 *
 * Responsibilities:
 * - Generate a unique testnet Bitcoin deposit address
 * - Compute session expiry (SESSION_TTL_MINUTES)
 * - Persist the session via MixSessionRepository
 * - Enforce rate limit via RateLimitRepository
 *
 * Does NOT know about HTTP, Supabase client, or Deno.serve.
 */

import type { MixSessionRepository } from "../ports/mix-session-repository.port.ts";
import type { RateLimitRepository } from "../ports/rate-limit-repository.port.ts";

const SESSION_TTL_MINUTES = 30;
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_SECONDS = 600;
const TESTNET_CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function generateTestnetAddress(): string {
  const body = new Uint8Array(38);
  crypto.getRandomValues(body);
  const encoded = Array.from(body, (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]).join("");
  return `tb1q${encoded.slice(0, 38)}`;
}

export interface CreateMixSessionInput {
  ipHash: string;
}

export type RateLimitDenied = { allowed: false; retryAfterSeconds: number };
export type CreateMixSessionResult =
  | RateLimitDenied
  | {
      allowed: true;
      session: {
        sessionId: string;
        depositAddress: string;
        createdAt: string;
        expiresAt: string;
        status: string;
      };
    };

export async function createMixSessionUseCase(
  input: CreateMixSessionInput,
  sessionRepo: MixSessionRepository,
  rateLimitRepo: RateLimitRepository,
): Promise<CreateMixSessionResult> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const count = await rateLimitRepo.count(input.ipHash, "mix-sessions", windowStart);

  if (count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterSeconds: RATE_LIMIT_WINDOW_SECONDS };
  }

  await rateLimitRepo.record(input.ipHash, "mix-sessions");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MINUTES * 60 * 1000);
  const depositAddress = generateTestnetAddress();

  const record = await sessionRepo.create({
    depositAddress,
    expiresAt: expiresAt.toISOString(),
    clientFingerprintHash: input.ipHash,
  });

  return {
    allowed: true,
    session: {
      sessionId: record.id,
      depositAddress: record.deposit_address,
      createdAt: record.created_at,
      expiresAt: record.expires_at,
      status: record.status,
    },
  };
}
