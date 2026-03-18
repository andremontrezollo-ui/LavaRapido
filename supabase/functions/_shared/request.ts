/**
 * Request Utilities for Edge Functions
 *
 * Helpers for parsing and extracting data from incoming HTTP requests.
 */

/** Safely parse a JSON body. Returns null on parse failure. */
export async function parseJsonBody<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Extract the client IP from the X-Forwarded-For header. */
export function extractClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Hash a string using SHA-256 (Web Crypto API — available in both Deno and browsers). */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a unique request ID using Web Crypto. */
export function generateRequestId(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
