/**
 * HealthCheck Port — optional external checks (database, queues, etc.)
 * Implementations are provided by the infrastructure layer.
 */

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  details?: string;
}

export interface HealthChecker {
  /** Name shown in the health response checks map. */
  name: string;
  check(): Promise<HealthCheckResult>;
}
