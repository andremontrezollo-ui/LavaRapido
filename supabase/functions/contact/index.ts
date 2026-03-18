import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { validationError, rateLimitError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { container } from "../../../backend/src/bootstrap/container.ts";
import { ContactValidationError, RateLimitExceededError } from "../../../backend/src/modules/contact/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return validationError("Invalid JSON");
    }

    if (!body || typeof body !== "object") return validationError("Invalid request body");
    const { subject, message, replyContact } = body as Record<string, unknown>;

    const result = await container.submitContactMessage.execute({
      clientIp,
      subject: typeof subject === "string" ? subject : "",
      message: typeof message === "string" ? message : "",
      replyContact: typeof replyContact === "string" ? replyContact : undefined,
    });

    logInfo("Ticket created", { requestId, endpoint: "contact", status: 201, latencyMs: Date.now() - startTime });
    return jsonResponse(result, 201);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      logWarn("Rate limit triggered", { requestId, endpoint: "contact", rateLimitTriggered: true, status: 429 });
      return rateLimitError(err.retryAfterSeconds);
    }
    if (err instanceof ContactValidationError) {
      return validationError(err.message);
    }
    logError("Unexpected error", { requestId, endpoint: "contact", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
