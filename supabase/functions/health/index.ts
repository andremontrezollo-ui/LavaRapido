/**
 * GET/POST /functions/v1/health
 * Health check. Thin HTTP adapter — delegates to HealthCheckUseCase.
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { methodNotAllowed } from "../_shared/error-response.ts";
import { HealthCheckUseCase } from "../../../backend/src/modules/health/application/use-cases/health-check.usecase.ts";

const healthCheck = new HealthCheckUseCase("1.0.0");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed();

  return jsonResponse(healthCheck.execute(), 200);
});
