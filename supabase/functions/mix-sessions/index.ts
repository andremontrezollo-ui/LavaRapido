import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { rateLimitError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { container } from "../../../backend/src/bootstrap/container.ts";
import { RateLimitExceededError } from "../../../backend/src/modules/mix-session/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const result = await container.createMixSession.execute({ clientIp });

    logInfo("Session created", { requestId, endpoint: "mix-sessions", status: 201, latencyMs: Date.now() - startTime });
    return jsonResponse(result, 201);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      logWarn("Rate limit triggered", { requestId, endpoint: "mix-sessions", rateLimitTriggered: true, status: 429 });
      return rateLimitError(err.retryAfterSeconds);
    }
    logError("Unexpected error", { requestId, endpoint: "mix-sessions", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
