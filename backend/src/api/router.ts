/**
 * Main Express Router — mounts all domain routes under /api/v1.
 *
 * Architecture Rule: This file is the single source of truth for HTTP routing.
 * No business logic here — only route mounting and middleware wiring.
 */

import { Router } from 'express';
import type { Logger } from '../shared/logging';
import type { DependencyContainer } from '../app/dependency-container';
import { HealthController } from './controllers/health.controller';
import { CorrelationIdMiddleware } from './middlewares/correlation-id.middleware';
import { RequestLoggingMiddleware } from './middlewares/request-logging.middleware';
import { RateLimitMiddleware, InMemoryRateLimitStore } from './middlewares/rate-limit.middleware';
import { SECURITY_HEADERS, hashIp } from './security/security-utils';
import { CryptoIdGenerator } from '../shared/ports/IdGenerator';
import { createSessionsRouter } from './routes/sessions.route';
import { createContactRouter } from './routes/contact.route';
import { errorResponse } from '../shared/http/api-response';
import { HttpStatus } from '../shared/http/HttpStatus';

export function createRouter(container: DependencyContainer, logger: Logger): Router {
  const root = Router();

  const correlationMiddleware = new CorrelationIdMiddleware(new CryptoIdGenerator());
  const loggingMiddleware = new RequestLoggingMiddleware(logger);
  const rateLimitStore = new InMemoryRateLimitStore();
  const rateLimiter = new RateLimitMiddleware(rateLimitStore, 10, 600);
  const healthController = new HealthController();

  // Apply security headers to all responses
  root.use((_req, res, next) => {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    next();
  });

  // Inject correlation ID
  root.use((req, res, next) => {
    const correlationId = correlationMiddleware.extract(req.headers as Record<string, string>);
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });

  // Request logging
  root.use((req, res, next) => {
    loggingMiddleware.logRequest(req.method, req.path, req.headers['x-correlation-id'] as string);
    next();
  });

  // Rate limiting for domain routes
  const rateLimitMiddleware = async (req: any, res: any, next: any) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    const ipHash = hashIp(ip);
    const endpoint = req.path.split('/')[1] ?? 'unknown';
    const result = await rateLimiter.check(ipHash, endpoint);
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds ?? 60));
      return res.status(HttpStatus.TOO_MANY_REQUESTS).json(
        errorResponse('RATE_LIMITED', 'Too many requests. Please try again later.'),
      );
    }
    next();
  };

  // Health endpoints (no rate limiting, no auth)
  root.get('/health', async (_req, res) => {
    const status = await healthController.liveness();
    res.status(HttpStatus.OK).json(status);
  });

  root.get('/ready', async (_req, res) => {
    const readiness = await container.readinessCheck();
    res.status(readiness.isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(readiness);
  });

  // Domain routes under /api/v1
  const v1 = Router();
  v1.use(rateLimitMiddleware);
  v1.use('/sessions', createSessionsRouter(container));
  v1.use('/contact', createContactRouter(container));

  root.use('/api/v1', v1);

  return root;
}
