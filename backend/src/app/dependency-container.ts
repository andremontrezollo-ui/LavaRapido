/**
 * DependencyContainer interface — provides readiness checks.
 */

export interface ReadinessResult {
  isReady: boolean;
  checks: Record<string, boolean>;
}

export interface DependencyContainer {
  readinessCheck(): Promise<ReadinessResult>;
}
