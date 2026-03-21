/**
 * Correlation ID Middleware — injects or propagates correlation IDs.
 */

import type { IdGenerator } from '../../shared/ports/IdGenerator';

export class CorrelationIdMiddleware {
  constructor(private readonly idGenerator: IdGenerator) {}

  extract(headers: Record<string, string>): string {
    const existing = headers['x-correlation-id'] || headers['x-request-id'];
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
      return existing;
    }
    return this.idGenerator.generate();
  }
}
