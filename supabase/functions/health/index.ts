/**
 * health — HTTP adapter (Edge Function).
 *
 * Responsibilities:
 *  1. Accept GET or POST.
 *  2. Call GetSystemHealthUseCase from the backend core.
 *  3. Return the health payload.
 *
 * NO business logic here.
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { methodNotAllowed } from "../_shared/error-response.ts";
import { GetSystemHealthUseCase } from "../../../backend/src/modules/health/application/use-cases/GetSystemHealth.ts";

const healthUseCase = new GetSystemHealthUseCase("1.0.0");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed();

  return jsonResponse(healthUseCase.execute(), 200);
});
