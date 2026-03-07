/**
 * Application Configuration — validated, typed, fail-fast.
 */

export interface AppConfig {
  readonly env: 'development' | 'test' | 'production';
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly rateLimitMaxRequests: number;
  readonly rateLimitWindowMinutes: number;
  readonly sessionTtlMinutes: number;
  readonly confirmationThreshold: number;
  readonly outboxPollIntervalMs: number;
  readonly maxRetries: number;
  readonly lockTtlSeconds: number;
}

export const DEFAULT_CONFIG: Partial<AppConfig> = {
  env: 'development',
  logLevel: 'info',
  rateLimitMaxRequests: 10,
  rateLimitWindowMinutes: 10,
  sessionTtlMinutes: 30,
  confirmationThreshold: 6,
  outboxPollIntervalMs: 5000,
  maxRetries: 3,
  lockTtlSeconds: 30,
};
