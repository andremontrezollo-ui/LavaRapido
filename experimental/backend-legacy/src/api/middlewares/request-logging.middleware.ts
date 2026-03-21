/**
 * Request Logging Middleware — logs requests safely (no sensitive data).
 */

import type { Logger } from '../../shared/logging';

export class RequestLoggingMiddleware {
  constructor(private readonly logger: Logger) {}

  logRequest(method: string, path: string, correlationId: string, ipHash?: string): void {
    this.logger.info('Incoming request', {
      method,
      path,
      correlationId,
      ...(ipHash ? { ipHash: ipHash.substring(0, 8) + '...' } : {}),
    });
  }

  logResponse(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    correlationId: string,
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.logger[level]('Request completed', {
      method,
      path,
      statusCode,
      duration: `${durationMs}ms`,
      correlationId,
    });
  }
}
