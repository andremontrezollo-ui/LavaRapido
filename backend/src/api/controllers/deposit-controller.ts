/**
 * Deposit Controller — POST /api/deposits
 *
 * Protected endpoint: authentication + authorization + rate-limit + validation + idempotency + saga.
 */

import type { IdempotencyPolicy } from '../../shared/policies/idempotency-policy';
import type { SagaOrchestrator, SagaState } from '../../infra/saga/saga-orchestrator';
import type { AuthMiddleware } from '../middlewares/auth.middleware';
import type { DefaultAuthorizationPolicy } from '../security/authorization-policy';
import type { RateLimitMiddleware } from '../middlewares/rate-limit.middleware';
import type { InputValidationMiddleware, DepositInput } from '../middlewares/input-validation-middleware';
import { depositInputSchema } from '../middlewares/input-validation-middleware';
import type { CorrelationIdMiddleware } from '../middlewares/correlation-id.middleware';
import type { RequestLoggingMiddleware } from '../middlewares/request-logging.middleware';
import type { SecureHeadersMiddleware } from '../middlewares/secure-headers-middleware';
import type { Logger } from '../../shared/logging';
import { createDepositProcessingSteps, type DepositSagaDependencies } from '../../modules/deposit-saga/deposit-processing.saga';

export interface DepositRequest {
  headers: Record<string, string | undefined>;
  body: unknown;
  ip?: string;
}

export interface DepositResponse {
  statusCode: number;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

export interface DepositControllerDeps {
  auth: AuthMiddleware;
  authorizationPolicy: DefaultAuthorizationPolicy;
  rateLimit: RateLimitMiddleware;
  inputValidation: InputValidationMiddleware;
  correlationId: CorrelationIdMiddleware;
  requestLogging: RequestLoggingMiddleware;
  secureHeaders: SecureHeadersMiddleware;
  idempotency: IdempotencyPolicy;
  sagaOrchestrator: SagaOrchestrator;
  sagaDeps: DepositSagaDependencies;
  idGenerator: { generate(): string };
  logger: Logger;
}

export class DepositController {
  constructor(private readonly deps: DepositControllerDeps) {}

  async handlePost(req: DepositRequest): Promise<DepositResponse> {
    const startTime = Date.now();
    const corrId = this.deps.correlationId.extract(
      req.headers as Record<string, string>,
    );
    const secureHeaders = this.deps.secureHeaders.getHeaders();

    this.deps.requestLogging.logRequest('POST', '/api/deposits', corrId, req.ip);

    // 1. Authentication
    const authResult = this.deps.auth.validate(req.headers['authorization'] ?? null);
    if (!authResult.authenticated) {
      return this.respond(401, { error: 'Unauthorized', reason: authResult.reason }, corrId, secureHeaders, startTime);
    }

    // 2. Authorization
    const authzResult = this.deps.authorizationPolicy.authorize(
      {
        userId: authResult.userId ?? '',
        roles: authResult.roles ?? [],
        scopes: authResult.scopes ?? [],
      },
      'POST',
      '/api/deposits',
    );
    if (!authzResult.authorized) {
      return this.respond(403, { error: 'Forbidden', reason: authzResult.reason }, corrId, secureHeaders, startTime);
    }

    // 3. Rate limiting (100 req/min)
    const ipHash = req.ip ?? 'unknown';
    const rateLimitResult = await this.deps.rateLimit.check(ipHash, 'POST:/api/deposits');
    if (!rateLimitResult.allowed) {
      return this.respond(429, {
        error: 'Too Many Requests',
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      }, corrId, secureHeaders, startTime, rateLimitResult.retryAfterSeconds);
    }

    // 4. Input validation
    const validation = this.deps.inputValidation.validate<DepositInput>(depositInputSchema, req.body);
    if (!validation.valid || !validation.data) {
      return this.respond(400, { error: 'Validation Error', details: validation.errors }, corrId, secureHeaders, startTime);
    }

    const input = validation.data;
    const depositId = this.deps.idGenerator.generate();
    const userId = authResult.userId ?? 'anonymous';

    // 5. Idempotency check + saga execution
    try {
      const result = await this.deps.idempotency.execute<{ depositId: string; status: string }>(
        input.idempotencyKey,
        async () => {
          const steps = createDepositProcessingSteps(
            {
              depositId,
              userId,
              amount: input.amount,
              walletAddress: input.walletAddress,
              networkId: input.networkId,
              correlationId: corrId,
            },
            this.deps.sagaDeps,
          );

          const sagaState = await this.deps.sagaOrchestrator.execute(
            'DepositProcessingSaga',
            steps,
          );

          if (sagaState.status !== 'completed') {
            const err = new SagaFailureError(sagaState);
            throw err;
          }

          return { depositId, status: 'completed' };
        },
      );

      this.deps.requestLogging.logResponse('POST', '/api/deposits', 200, Date.now() - startTime, corrId);
      return {
        statusCode: 200,
        body: { ...result, correlationId: corrId },
        headers: { ...secureHeaders, 'Content-Type': 'application/json' },
      };
    } catch (err) {
      if (err instanceof SagaFailureError) {
        this.deps.logger.warn('Deposit saga failed', {
          sagaId: err.state.sagaId,
          failedStep: err.state.failedStep,
          error: err.state.error,
          correlationId: corrId,
        });
        this.deps.requestLogging.logResponse('POST', '/api/deposits', 400, Date.now() - startTime, corrId);
        return this.respond(400, {
          error: 'Deposit Failed',
          sagaId: err.state.sagaId,
          failedStep: err.state.failedStep,
          sagaStatus: err.state.status,
        }, corrId, secureHeaders, startTime);
      }

      this.deps.logger.error('Unexpected error in deposit controller', {
        error: err instanceof Error ? err.message : String(err),
        correlationId: corrId,
      });
      this.deps.requestLogging.logResponse('POST', '/api/deposits', 500, Date.now() - startTime, corrId);
      return this.respond(500, { error: 'Internal Server Error' }, corrId, secureHeaders, startTime);
    }
  }

  private respond(
    statusCode: number,
    body: Record<string, unknown>,
    correlationId: string,
    secureHeaders: Record<string, string>,
    _startTime: number,
    retryAfter?: number,
  ): DepositResponse {
    const headers: Record<string, string> = {
      ...secureHeaders,
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    };
    if (retryAfter !== undefined) {
      headers['Retry-After'] = String(retryAfter);
    }
    return { statusCode, body: { ...body, correlationId }, headers };
  }
}

class SagaFailureError extends Error {
  constructor(public readonly state: SagaState) {
    super(`Saga failed at step '${state.failedStep}': ${state.error}`);
  }
}
