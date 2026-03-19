/**
 * Mix Sessions — HTTP Entry Point
 * POST /functions/v1/mix-sessions
 *
 * Parses the request, extracts IP, then delegates to the CreateMixSession use case.
 * All business logic lives in _shared/use-cases/create-mix-session.usecase.ts.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { rateLimitError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { hashString } from "../_shared/rate-limiter.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { createMixSessionUseCase } from "../_shared/use-cases/create-mix-session.usecase.ts";
import { createSupabaseMixSessionRepository } from "../_shared/adapters/supabase-mix-session.adapter.ts";
import { createSupabaseRateLimitRepository } from "../_shared/adapters/supabase-rate-limit.adapter.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashString(clientIp);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const result = await createMixSessionUseCase(
      { ipHash },
      createSupabaseMixSessionRepository(supabase),
      createSupabaseRateLimitRepository(supabase),
    );

    if (!result.allowed) {
      logWarn("Rate limit triggered", { requestId, endpoint: "mix-sessions", rateLimitTriggered: true, status: 429 });
      return rateLimitError(result.retryAfterSeconds);
    }

    logInfo("Session created", { requestId, endpoint: "mix-sessions", status: 201, latencyMs: Date.now() - startTime });
    return jsonResponse(result.session, 201);
  } catch {
    logError("Unexpected error", { requestId, endpoint: "mix-sessions", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
