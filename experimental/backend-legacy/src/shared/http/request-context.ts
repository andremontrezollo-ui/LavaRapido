/**
 * Request Context — carries correlation data through the request lifecycle.
 */

export interface RequestContext {
  readonly correlationId: string;
  readonly requestId: string;
  readonly timestamp: Date;
  readonly ipHash?: string;
  readonly userAgent?: string;
  readonly path: string;
  readonly method: string;
}

export function createRequestContext(
  idGenerator: { generate(): string },
  path: string,
  method: string,
  ipHash?: string,
  correlationId?: string,
): RequestContext {
  const requestId = idGenerator.generate();
  return {
    correlationId: correlationId ?? requestId,
    requestId,
    timestamp: new Date(),
    ipHash,
    path,
    method,
  };
}
