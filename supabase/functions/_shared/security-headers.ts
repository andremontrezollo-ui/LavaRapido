/**
 * Shared Security Headers for Edge Functions — HTTP entry layer
 *
 * Security header constants are sourced from the CORE backend
 * (backend/src/infra/security/SecurityHeaders.ts) to keep a single
 * source of truth.  This file only adds the Deno-specific Response
 * helpers that are not appropriate in the Node.js backend.
 */

// Re-export canonical constants from the backend CORE.
// These files have no internal imports so they are importable from Deno.
export {
  SECURITY_HEADERS,
  CORS_HEADERS,
} from "../../../backend/src/infra/security/SecurityHeaders.ts";

import {
  SECURITY_HEADERS,
  CORS_HEADERS,
} from "../../../backend/src/infra/security/SecurityHeaders.ts";

/** Build a JSON response with all security + CORS headers applied. */
export function jsonResponse(
  body: unknown,
  status: number,
  extra?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      ...extra,
    },
  });
}

/** CORS preflight response (OPTIONS). */
export function corsResponse(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}
