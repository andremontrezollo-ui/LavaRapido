/**
 * health module public API
 *
 * Import from this index to use the health module.
 */

// Application — Use Cases
export { GetSystemHealthUseCase } from './application/use-cases/get-system-health.usecase';

// Application — DTOs
export type { SystemHealthResponse } from './application/dtos/health.dto';

// Application — Ports
export type { HealthChecker, HealthCheckResult } from './application/ports/health-checker.port';
