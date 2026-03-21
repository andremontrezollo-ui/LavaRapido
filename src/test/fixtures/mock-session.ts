/**
 * Mock Session Fixtures (Test / Simulator only)
 *
 * Generates simulated testnet deposit addresses and session IDs.
 * NOT for production use — demonstration and testing purposes only.
 *
 * Types conform to the canonical MixSessionResponse contract from
 * @/contracts/mix-session so tests remain aligned with the real API shape.
 */

import type { MixSessionResponse, MixSessionStatus } from "@/contracts/mix-session";

const TESTNET_CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Generates a cryptographically random hex string. */
function randomHex(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a mock testnet bech32-like address (tb1q prefix).
 * These are NOT valid on-chain — purely for UI demonstration.
 */
export function generateMockTestnetAddress(): string {
  const body = new Uint8Array(38);
  crypto.getRandomValues(body);
  const encoded = Array.from(
    body,
    (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]
  ).join("");
  return `tb1q${encoded.slice(0, 38)}`;
}

/** Generates a UUID v4. */
export function generateSessionId(): string {
  const hex = randomHex(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "4" + hex.slice(13, 16),
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Runtime representation of a mix session used by the frontend UI.
 * Date fields are proper Date objects (unlike the wire format which uses ISO strings).
 */
export interface MixSession {
  sessionId: string;
  depositAddress: string;
  createdAt: Date;
  expiresAt: Date;
  status: MixSessionStatus;
}

/**
 * Converts a canonical MixSessionResponse (wire format) to a MixSession
 * (runtime format with Date objects).
 */
export function fromApiResponse(resp: MixSessionResponse): MixSession {
  return {
    sessionId: resp.sessionId,
    depositAddress: resp.depositAddress,
    createdAt: new Date(resp.createdAt),
    expiresAt: new Date(resp.expiresAt),
    status: resp.status,
  };
}

/**
 * Creates a new simulated mix session.
 * Each call generates a unique session + address.
 */
export function createMockSession(): MixSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

  return {
    sessionId: generateSessionId(),
    depositAddress: generateMockTestnetAddress(),
    createdAt: now,
    expiresAt,
    status: "pending_deposit",
  };
}
