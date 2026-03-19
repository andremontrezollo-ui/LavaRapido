/**
 * Mix Session Domain Logic
 *
 * CORE business rules for deposit address generation and session lifecycle.
 * This is the canonical source of truth — consumed by the HTTP entry layer
 * (supabase/functions) as a thin adapter.
 *
 * Intentionally self-contained (no internal imports) so it can be imported
 * from both the Node.js backend and the Deno edge-function runtime.
 */

/** Testnet address character set (bech32-safe characters) */
const TESTNET_CHARSET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Session time-to-live in milliseconds (30 minutes) */
export const SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * Generate a cryptographically secure Bitcoin deposit address.
 * Uses the Web Crypto API, available in both Node.js ≥19 and Deno.
 */
export function generateDepositAddress(network: 'testnet' | 'mainnet' = 'testnet'): string {
  const prefix = network === 'mainnet' ? 'bc1q' : 'tb1q';
  const body = new Uint8Array(38);
  crypto.getRandomValues(body);
  const encoded = Array.from(body, (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]).join('');
  return `${prefix}${encoded.slice(0, 38)}`;
}

/**
 * Compute the expiry timestamp for a new mix session.
 */
export function getSessionExpiresAt(createdAt: Date = new Date()): Date {
  return new Date(createdAt.getTime() + SESSION_TTL_MS);
}

/**
 * Determine whether a session has passed its expiry time.
 */
export function isSessionExpired(expiresAt: string | Date): boolean {
  return new Date(expiresAt) < new Date();
}
