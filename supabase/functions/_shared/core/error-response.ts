/**
 * Standardized Error Responses for Edge Functions
 */

import { jsonResponse } from "./security-headers.ts";

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  BAD_REQUEST: "BAD_REQUEST",
  SESSION_EXPIRED: "SESSION_EXPIRED",
} as const;

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): Response {
  const extra: Record<string, string> = {};
  if (code === ErrorCodes.RATE_LIMITED && details?.retryAfterSeconds) {
    extra["Retry-After"] = String(details.retryAfterSeconds);
  }
  return jsonResponse({ error: { code, message, ...(details ? { details } : {}) } }, status, extra);
}

export function validationError(message: string): Response {
  return errorResponse(400, ErrorCodes.VALIDATION_ERROR, message);
}

export function notFoundError(message = "Resource not found"): Response {
  return errorResponse(404, ErrorCodes.NOT_FOUND, message);
}

export function rateLimitError(retryAfterSeconds: number): Response {
  return errorResponse(429, ErrorCodes.RATE_LIMITED, "Too many requests. Please try again later.", { retryAfterSeconds });
}

export function internalError(): Response {
  return errorResponse(500, ErrorCodes.INTERNAL_ERROR, "Internal server error");
}

export function methodNotAllowed(): Response {
  return errorResponse(405, ErrorCodes.METHOD_NOT_ALLOWED, "Method not allowed");
}
