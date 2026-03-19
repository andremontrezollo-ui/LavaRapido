/**
 * SHA-256 hash of a string. Returns a lowercase hex digest.
 * Uses the Web Crypto API — works in both Deno and modern browsers.
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
