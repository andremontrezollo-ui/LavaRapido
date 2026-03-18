/**
 * health Edge Function — thin HTTP adapter
 *
 * GET or POST /functions/v1/health
 * Returns the system health status.
 *
 * Business logic lives in: backend/src/modules/health/application/use-cases/get-system-health.usecase.ts
 * Supabase adapter wired in: supabase/functions/_shared/container.ts
 */

import { corsResponse } from "../_shared/cors.ts";
import { jsonResponse } from "../_shared/response.ts";
import { errors } from "../_shared/errors.ts";
import { getContainer } from "../_shared/container.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "GET" && req.method !== "POST") return errors.methodNotAllowed();

  const container = getContainer();
  const health = container.getSystemHealth();

  return jsonResponse({
    status: health.status,
    version: health.version,
    uptime: health.uptimeSeconds,
    timestamp: health.timestamp,
  }, 200);
});
