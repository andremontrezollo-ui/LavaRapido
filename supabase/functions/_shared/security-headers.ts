/**
 * Shared Security Headers for Edge Functions
 *
 * Centralized headers applied to all responses.
 * Set ALLOWED_ORIGIN env var to restrict CORS to your frontend domain.
 * Defaults to no wildcard — returns the allowed origin only if the request
 * origin matches the allowlist.
 */

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

/**
 * Returns CORS headers restricted to the configured allowed origin.
 * If ALLOWED_ORIGIN is not set, no Allow-Origin header is returned,
 * effectively blocking cross-origin requests.
 */
function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "";
  const allowedList = allowedOrigin
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const origin =
    requestOrigin && allowedList.includes(requestOrigin)
      ? requestOrigin
      : allowedList[0] ?? "";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return headers;
}

export function jsonResponse(
  body: unknown,
  status: number,
  extra?: Record<string, string>,
  requestOrigin?: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(requestOrigin),
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      ...extra,
    },
  });
}

export function corsResponse(requestOrigin?: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(requestOrigin),
  });
}
