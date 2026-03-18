/**
 * API Layer — exports all controllers, middlewares, schemas, security, contracts and presenters.
 */

// Controllers
export { HealthController } from './controllers/health.controller';
export type { HealthStatus } from './controllers/health.controller';

// Middlewares
export { AuthMiddleware } from './middlewares/auth.middleware';
export type { AuthResult } from './middlewares/auth.middleware';
export { AuthorizationMiddleware } from './middlewares/authorization.middleware';
export type { Scope, AuthorizationResult } from './middlewares/authorization.middleware';
export { CorrelationIdMiddleware } from './middlewares/correlation-id.middleware';
export { RateLimitMiddleware, InMemoryRateLimitStore } from './middlewares/rate-limit.middleware';
export type { RateLimitResult, RateLimitStore } from './middlewares/rate-limit.middleware';
export { RequestLoggingMiddleware } from './middlewares/request-logging.middleware';

// Errors
export { ErrorHandler } from './errors/error-handler';

// Schemas
export { validateCreateMixSession, validateContact } from './schemas/validation.schemas';
export type { ValidationResult, CreateMixSessionInput, ContactInput } from './schemas/validation.schemas';

// Security
export { hashIp, SECURITY_HEADERS } from './security/security-utils';

// Validators (legacy)
export { validateContactPayload, validateSessionId } from './validators/index';

// Contracts — stable HTTP request/response shapes
export * from './contracts';

// Presenters — maps use-case DTOs to HTTP contracts
export { MixSessionPresenter } from './presenters/mix-session.presenter';
export { ContactPresenter } from './presenters/contact.presenter';
export { HealthPresenter } from './presenters/health.presenter';
