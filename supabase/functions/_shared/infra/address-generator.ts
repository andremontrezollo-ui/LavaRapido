/**
 * Mock testnet address generator (shared across Edge Functions).
 *
 * Generates bech32-like testnet addresses (tb1q…) for demonstration/development.
 * These are NOT valid on-chain addresses.
 */

const TESTNET_CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function generateMockTestnetAddress(): string {
  const body = new Uint8Array(38);
  crypto.getRandomValues(body);
  const encoded = Array.from(body, (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]).join("");
  return `tb1q${encoded.slice(0, 38)}`;
}
