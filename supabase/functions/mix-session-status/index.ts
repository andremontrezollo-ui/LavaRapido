/**
 * mix-session-status — HTTP adapter (Edge Function).
 *
 * Responsibilities:
 *  1. Parse the request body.
 *  2. Call GetMixSessionStatusUseCase from the backend core.
 *  3. Map use-case errors to HTTP responses.
 *
 * NO business logic here.
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { validationError, notFoundError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { SupabaseMixSessionRepository } from "../_shared/repositories/SupabaseMixSessionRepository.ts";
import { GetMixSessionStatusUseCase, GetMixSessionStatusError } from "../../../backend/src/modules/mix-session/application/use-cases/GetMixSessionStatus.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return validationError("Invalid JSON");
    }

    if (!body || typeof body !== "object") return validationError("Invalid request body");
    const { sessionId } = body as Record<string, unknown>;
    if (typeof sessionId !== "string") return validationError("sessionId must be a string");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const useCase = new GetMixSessionStatusUseCase(
      new SupabaseMixSessionRepository(supabaseUrl, serviceRoleKey),
    );

    const result = await useCase.execute({ sessionId });

    logInfo("Session status queried", { requestId, endpoint: "mix-session-status", status: 200, latencyMs: Date.now() - startTime });

    return jsonResponse(result, 200);
  } catch (err) {
    if (err instanceof GetMixSessionStatusError) {
      if (err.code === "INVALID_SESSION_ID") return validationError(err.message);
      if (err.code === "NOT_FOUND") {
        logInfo("Session not found", { requestId, endpoint: "mix-session-status", status: 404, latencyMs: Date.now() - startTime });
        return notFoundError(err.message);
      }
    }
    logError("Unexpected error", { requestId, endpoint: "mix-session-status", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
