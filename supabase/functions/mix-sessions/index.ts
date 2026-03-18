/**
 * mix-sessions Edge Function — thin HTTP adapter
 *
 * POST /functions/v1/mix-sessions
 * Creates a new Bitcoin mixing session and returns a deposit address.
 *
 * Business logic lives in: backend/src/modules/mix-session/application/use-cases/create-mix-session.usecase.ts
 * Supabase adapter wired in: supabase/functions/_shared/container.ts
 */

import { corsResponse } from "../_shared/cors.ts";
import { jsonResponse } from "../_shared/response.ts";
import { errors } from "../_shared/errors.ts";
import { telemetry } from "../_shared/telemetry.ts";
import { extractClientIp, generateRequestId } from "../_shared/request.ts";
import { getContainer } from "../_shared/container.ts";

const RATE_LIMIT = { endpoint: "mix-sessions", maxRequests: 10, windowSeconds: 600 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return errors.methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();
  const container = getContainer();

  try {
    const clientIp = extractClientIp(req);
    const ipHash = await container.hashString(clientIp);

    // Rate limiting
    const rl = await container.checkRateLimit(ipHash, RATE_LIMIT);
    if (!rl.allowed) {
      telemetry.warn("Rate limit triggered", { requestId, endpoint: "mix-sessions", rateLimitTriggered: true, status: 429 });
      return errors.rateLimit(rl.retryAfterSeconds);
    }
    await container.recordRateLimit(ipHash, RATE_LIMIT.endpoint);

    // Delegate to use case
    const result = await container.createMixSession({ clientFingerprintHash: ipHash });

    telemetry.info("Session created", { requestId, endpoint: "mix-sessions", status: 201, latencyMs: Date.now() - startTime });
    return jsonResponse(result, 201);
  } catch {
    telemetry.error("Unexpected error", { requestId, endpoint: "mix-sessions", status: 500, latencyMs: Date.now() - startTime });
    return errors.internal();
  }
});
