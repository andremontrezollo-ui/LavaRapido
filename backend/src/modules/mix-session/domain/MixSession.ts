/**
 * MixSession — domain entity and helpers.
 *
 * A MixSession represents a single Bitcoin-mixing session.
 * All business rules related to session lifecycle live here.
 */

export type MixSessionStatus = 'active' | 'expired' | 'completed';

export interface MixSession {
  id: string;
  depositAddress: string;
  status: MixSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  clientFingerprintHash: string;
}

/** Session expiry duration in minutes. */
export const SESSION_EXPIRY_MINUTES = 30;

/** Charset used when building testnet addresses. */
const TESTNET_CHARSET = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Generate a mock Bitcoin testnet address (tb1q…).
 * Uses Web Crypto API, available in Deno and Node.js 15+.
 */
export function generateTestnetAddress(): string {
  const body = new Uint8Array(38);
  crypto.getRandomValues(body);
  const encoded = Array.from(body, (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]).join('');
  return `tb1q${encoded.slice(0, 38)}`;
}

/**
 * Returns true when the session has passed its expiry timestamp.
 */
export function isSessionExpired(session: MixSession, now: Date = new Date()): boolean {
  return now > session.expiresAt;
}
