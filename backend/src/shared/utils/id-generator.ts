/**
 * Generates a mock testnet bech32-like deposit address (tb1q prefix).
 * These are NOT valid on-chain — demonstration / testnet purposes only.
 */
export function generateMockTestnetAddress(): string {
  const charset = "0123456789abcdefghijklmnopqrstuvwxyz";
  const body = new Uint8Array(38);
  crypto.getRandomValues(body);
  const encoded = Array.from(body, (b) => charset[b % charset.length]).join("");
  return `tb1q${encoded.slice(0, 38)}`;
}

/**
 * Generates a secure random ticket ID (e.g. TKT-AB2X9Y).
 */
export function generateTicketId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return "TKT-" + Array.from(array, (b) => chars[b % chars.length]).join("");
}

/**
 * Generates a UUID v4.
 */
export function generateUuid(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "4" + hex.slice(13, 16),
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Generates a short random request ID for log correlation.
 */
export function generateRequestId(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
