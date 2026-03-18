/**
 * Error Utilities for Edge Functions
 *
 * Standardised error codes and response helpers.
 * Mirrors the error contract defined in backend/src/api/contracts/.
 */

import { jsonResponse } from "./response.ts";

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  BAD_REQUEST: "BAD_REQUEST",
  SESSION_EXPIRED: "SESSION_EXPIRED",
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export function errorResponse(
  status: number,
  code: ErrorCode | string,
  message: string,
  details?: Record<string, unknown>,
): Response {
  const extra: Record<string, string> = {};
  if (code === ErrorCodes.RATE_LIMITED && details?.retryAfterSeconds) {
    extra["Retry-After"] = String(details.retryAfterSeconds);
  }
  return jsonResponse(
    { error: { code, message, ...(details ? { details } : {}) } },
    status,
    extra,
  );
}

export const errors = {
  validation: (message: string): Response =>
    errorResponse(400, ErrorCodes.VALIDATION_ERROR, message),

  notFound: (message = "Resource not found"): Response =>
    errorResponse(404, ErrorCodes.NOT_FOUND, message),

  rateLimit: (retryAfterSeconds: number): Response =>
    errorResponse(429, ErrorCodes.RATE_LIMITED, "Too many requests. Please try again later.", {
      retryAfterSeconds,
    }),

  internal: (): Response =>
    errorResponse(500, ErrorCodes.INTERNAL_ERROR, "Internal server error"),

  methodNotAllowed: (): Response =>
    errorResponse(405, ErrorCodes.METHOD_NOT_ALLOWED, "Method not allowed"),
} as const;
