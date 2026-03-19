/**
 * Cleanup Job — HTTP Entry Point
 *
 * Triggered via pg_cron or manual invocation.
 * Delegates all cleanup logic to the RunCleanup use case.
 * All business logic lives in _shared/use-cases/run-cleanup.usecase.ts.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { runCleanupUseCase } from "../_shared/use-cases/run-cleanup.usecase.ts";
import { createSupabaseMixSessionRepository } from "../_shared/adapters/supabase-mix-session.adapter.ts";
import { createSupabaseRateLimitRepository } from "../_shared/adapters/supabase-rate-limit.adapter.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const result = await runCleanupUseCase(
      createSupabaseMixSessionRepository(supabase),
      createSupabaseRateLimitRepository(supabase),
    );

    logInfo("Cleanup completed", {
      requestId,
      endpoint: "cleanup",
      status: 200,
      latencyMs: Date.now() - startTime,
      expiredSessions: result.expiredSessions,
      deletedRateLimits: result.deletedRateLimits,
    });

    return jsonResponse({ status: "ok", ...result, timestamp: new Date().toISOString() }, 200);
  } catch {
    logError("Cleanup failed", { requestId, endpoint: "cleanup", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
