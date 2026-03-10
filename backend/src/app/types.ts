/**
 * Application core types — interface contracts for startup and DI.
 */

export interface Application {
  start(): Promise<void>;
  stop(): Promise<void>;
  isHealthy(): boolean;
}

export interface ReadinessResult {
  isReady: boolean;
  checks: Record<string, CheckResult>;
  timestamp: string;
}

export interface CheckResult {
  status: 'ok' | 'degraded' | 'error';
  details?: string;
}
