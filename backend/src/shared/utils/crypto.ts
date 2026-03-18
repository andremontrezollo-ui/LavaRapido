/**
 * Shared crypto utilities — compatible with Deno and Node.js (Web Crypto API).
 */

/**
 * Returns the SHA-256 hex digest of the given string.
 * Uses the Web Crypto API, which is available in both Deno and modern Node.js.
 */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
