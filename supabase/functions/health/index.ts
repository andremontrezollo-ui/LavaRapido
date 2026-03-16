/**
 * Health Check Endpoint
 * GET /functions/v1/health
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { methodNotAllowed } from "../_shared/error-response.ts";

const START_TIME = Date.now();
const VERSION = "1.0.0";

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get("origin");
  if (req.method === "OPTIONS") return corsResponse(requestOrigin);
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed();

  const uptimeSeconds = Math.round((Date.now() - START_TIME) / 1000);

  return jsonResponse({
    status: "ok",
    uptime: uptimeSeconds,
    version: VERSION,
    timestamp: new Date().toISOString(),
  }, 200, undefined, requestOrigin);
});
