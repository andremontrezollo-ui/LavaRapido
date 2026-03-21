/**
 * Standardized Error Response Format
 */

export interface ErrorDetail {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ErrorResponse {
  readonly error: ErrorDetail;
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  CONFLICT: 'CONFLICT',
  FORBIDDEN: 'FORBIDDEN',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export function createErrorResponse(code: ErrorCode, message: string, details?: Record<string, unknown>): ErrorResponse {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

export function validationError(message: string, details?: Record<string, unknown>): ErrorResponse {
  return createErrorResponse(ErrorCodes.VALIDATION_ERROR, message, details);
}

export function notFoundError(message = 'Resource not found'): ErrorResponse {
  return createErrorResponse(ErrorCodes.NOT_FOUND, message);
}

export function rateLimitedError(retryAfterSeconds: number): ErrorResponse {
  return createErrorResponse(ErrorCodes.RATE_LIMITED, 'Too many requests.', { retryAfterSeconds });
}

export function internalError(message = 'Internal server error'): ErrorResponse {
  return createErrorResponse(ErrorCodes.INTERNAL_ERROR, message);
}

export function methodNotAllowed(): ErrorResponse {
  return createErrorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed');
}
