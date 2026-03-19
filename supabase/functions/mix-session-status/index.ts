/**
 * Mix Session Status — HTTP Entry Point
 * POST /functions/v1/mix-session-status
 * Body: { sessionId: "uuid" }
 *
 * Parses the request, validates UUID format, then delegates to the
 * GetSessionStatus use case. All business logic lives in
 * _shared/use-cases/get-session-status.usecase.ts.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { validationError, notFoundError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { isValidSessionId, getSessionStatusUseCase } from "../_shared/use-cases/get-session-status.usecase.ts";
import { createSupabaseMixSessionRepository } from "../_shared/adapters/supabase-mix-session.adapter.ts";

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

    if (typeof sessionId !== "string" || !isValidSessionId(sessionId)) {
      return validationError("Invalid session ID format. Must be a valid UUID.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const result = await getSessionStatusUseCase(
      sessionId,
      createSupabaseMixSessionRepository(supabase),
    );

    if (!result.found) {
      logInfo("Session not found", { requestId, endpoint: "mix-session-status", status: 404, latencyMs: Date.now() - startTime });
      return notFoundError("Session not found");
    }

    logInfo("Session status queried", { requestId, endpoint: "mix-session-status", status: 200, latencyMs: Date.now() - startTime });
    return jsonResponse(result.session, 200);
  } catch {
    logError("Unexpected error", { requestId, endpoint: "mix-session-status", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
