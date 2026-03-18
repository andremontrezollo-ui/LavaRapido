/**
 * Health Check Endpoint
 * GET /functions/v1/health
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { methodNotAllowed } from "../_shared/error-response.ts";
import { container } from "../../../backend/src/bootstrap/container.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed();

  const result = await container.getSystemHealth.execute();
  return jsonResponse(result, 200);
});
