/**
 * Mock Session Generator (Educational/Simulator)
 * 
 * Generates simulated testnet deposit addresses and session IDs.
 * NOT for real blockchain use — demonstration purposes only.
 */

const TESTNET_CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz";

/**
 * Generates a cryptographically random hex string
 */
function randomHex(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a mock testnet bech32-like address (tb1q prefix)
 * These are NOT valid on-chain — purely for UI demonstration.
 */
export function generateMockTestnetAddress(): string {
  const body = new Uint8Array(32);
  crypto.getRandomValues(body);
  const encoded = Array.from(body, (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]).join("");
  return `tb1q${encoded.slice(0, 38)}`;
}

/**
 * Generates a UUID v4
 */
export function generateSessionId(): string {
  const hex = randomHex(16);
  // Format as UUID v4
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "4" + hex.slice(13, 16),
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}

export interface MixSession {
  sessionId: string;
  depositAddress: string;
  createdAt: Date;
  expiresAt: Date;
  status: "pending_deposit" | "processing" | "completed" | "expired";
}

/**
 * Creates a new simulated mix session.
 * Each call generates unique session + address.
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
