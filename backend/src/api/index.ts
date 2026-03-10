/**
 * API Layer — exports all controllers, middlewares, schemas, and security.
 */

// Controllers
export { HealthController } from './controllers/health.controller';
export type { HealthStatus } from './controllers/health.controller';
export { DepositController } from './controllers/deposit-controller';
export type { DepositRequest, DepositResponse, DepositControllerDeps } from './controllers/deposit-controller';

// Middlewares
export { AuthMiddleware } from './middlewares/auth.middleware';
export type { AuthResult } from './middlewares/auth.middleware';
export { AuthorizationMiddleware } from './middlewares/authorization.middleware';
export type { Scope as LegacyScope, AuthorizationResult as LegacyAuthorizationResult } from './middlewares/authorization.middleware';
export { CorrelationIdMiddleware } from './middlewares/correlation-id.middleware';
export { RateLimitMiddleware, InMemoryRateLimitStore, RedisRateLimitStore } from './middlewares/rate-limit.middleware';
export type { RateLimitResult, RateLimitStore, RedisClient } from './middlewares/rate-limit.middleware';
export { RequestLoggingMiddleware } from './middlewares/request-logging.middleware';
export { InputValidationMiddleware, depositInputSchema } from './middlewares/input-validation-middleware';
export type { DepositInput, ValidationSchema } from './middlewares/input-validation-middleware';
export { SecureHeadersMiddleware, DEFAULT_SECURE_HEADERS } from './middlewares/secure-headers-middleware';
export type { SecureHeadersOptions } from './middlewares/secure-headers-middleware';

// Errors
export { ErrorHandler } from './errors/error-handler';

// Schemas
export { validateCreateMixSession, validateContact } from './schemas/validation.schemas';
export type { ValidationResult, CreateMixSessionInput, ContactInput } from './schemas/validation.schemas';

// Security
export { hashIp, SECURITY_HEADERS } from './security/security-utils';
export { JwtVerifier } from './security/jwt-verifier';
export type { JwtPayload, JwtVerifyResult } from './security/jwt-verifier';
export { AuthService } from './security/auth-service';
export type { User, UserRepository, AuthenticateResult } from './security/auth-service';
export { DefaultAuthorizationPolicy } from './security/authorization-policy';
export type { Role, AuthorizationContext } from './security/authorization-policy';

// Validators (legacy)
export { validateContactPayload, validateSessionId } from './validators/index';
