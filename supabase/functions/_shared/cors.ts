/**
 * CORS Utilities for Edge Functions
 *
 * Provides CORS headers and a preflight response helper.
 */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Returns a 204 response for CORS preflight (OPTIONS) requests. */
export function corsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
