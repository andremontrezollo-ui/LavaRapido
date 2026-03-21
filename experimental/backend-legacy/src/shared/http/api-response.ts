/**
 * Standardized API Response wrapper.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    correlationId?: string;
    timestamp: string;
  };
}

export function successResponse<T>(data: T, correlationId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), ...(correlationId ? { correlationId } : {}) },
  };
}

export function errorResponse(code: string, message: string, details?: Record<string, unknown>, correlationId?: string): ApiResponse {
  return {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
    meta: { timestamp: new Date().toISOString(), ...(correlationId ? { correlationId } : {}) },
  };
}
