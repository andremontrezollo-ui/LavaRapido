/**
 * POST /functions/v1/mix-session-status
 * Queries session status. Thin HTTP adapter — delegates to GetSessionStatusUseCase.
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { validationError, notFoundError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { createSupabaseClient } from "../_shared/adapters/supabase-client.factory.ts";
import { SupabaseMixSessionRepository } from "../_shared/adapters/mix-session.repository.ts";
import { GetSessionStatusUseCase } from "../../../backend/src/modules/mix-session/application/use-cases/get-session-status.usecase.ts";
import { SessionNotFoundError } from "../../../backend/src/modules/mix-session/domain/errors/session-not-found.error.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
      return validationError("Invalid session ID format. Must be a valid UUID.");
    }

    const supabase = createSupabaseClient();
    const sessions = new SupabaseMixSessionRepository(supabase);
    const useCase = new GetSessionStatusUseCase(sessions);
    const result = await useCase.execute(sessionId);

    logInfo("Session status queried", { requestId, endpoint: "mix-session-status", status: 200, latencyMs: Date.now() - startTime });
    return jsonResponse(result, 200);
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      logInfo("Session not found", { requestId, endpoint: "mix-session-status", status: 404, latencyMs: Date.now() - startTime });
      return notFoundError("Session not found");
    }
    logError("Unexpected error", { requestId, endpoint: "mix-session-status", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
