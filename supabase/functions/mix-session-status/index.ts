/**
 * mix-session-status Edge Function — thin HTTP adapter
 *
 * POST /functions/v1/mix-session-status
 * Body: { sessionId: "uuid" }
 *
 * Business logic lives in: backend/src/modules/mix-session/application/use-cases/get-mix-session-status.usecase.ts
 * Supabase adapter wired in: supabase/functions/_shared/container.ts
 */

import { corsResponse } from "../_shared/cors.ts";
import { jsonResponse } from "../_shared/response.ts";
import { errors, ErrorCodes } from "../_shared/errors.ts";
import { telemetry } from "../_shared/telemetry.ts";
import { parseJsonBody, generateRequestId } from "../_shared/request.ts";
import { getContainer, SessionNotFoundError } from "../_shared/container.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return errors.methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();
  const container = getContainer();

  try {
    const body = await parseJsonBody<Record<string, unknown>>(req);
    if (!body) return errors.validation("Invalid JSON");

    const { sessionId } = body;
    if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
      return errors.validation("Invalid session ID format. Must be a valid UUID.");
    }

    // Delegate to use case
    const result = await container.getMixSessionStatus({ sessionId });

    telemetry.info("Session status queried", { requestId, endpoint: "mix-session-status", status: 200, latencyMs: Date.now() - startTime });
    return jsonResponse(result, 200);
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      telemetry.info("Session not found", { requestId, endpoint: "mix-session-status", status: 404, latencyMs: Date.now() - startTime });
      return errors.notFound("Session not found");
    }
    telemetry.error("Unexpected error", { requestId, endpoint: "mix-session-status", status: 500, latencyMs: Date.now() - startTime });
    return errors.internal();
  }
});
