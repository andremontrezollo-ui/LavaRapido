/**
 * Application Configuration — validated, typed, fail-fast.
 */

export interface AppConfig {
  readonly env: 'development' | 'test' | 'production';
  // Infrastructure
  readonly databaseUrl: string;
  readonly redisUrl: string;
  // Auth
  readonly jwtSecret: string;
  // Supabase (optional — legacy edge functions)
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  // Logging
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  // Rate limiting
  readonly rateLimitMax: number;
  readonly rateLimitWindowMs: number;
  // Backwards-compat aliases kept for existing modules
  readonly rateLimitMaxRequests: number;
  readonly rateLimitWindowMinutes: number;
  // Sessions
  readonly sessionTtlMinutes: number;
  // Blockchain
  readonly confirmationThreshold: number;
  // Outbox
  readonly outboxPollIntervalMs: number;
  // Retries / Locks
  readonly maxRetries: number;
  readonly lockTtlSeconds: number;
}

export const DEFAULT_CONFIG: Partial<AppConfig> = {
  env: 'development',
  logLevel: 'info',
  rateLimitMax: 100,
  rateLimitWindowMs: 60_000,
  rateLimitMaxRequests: 100,
  rateLimitWindowMinutes: 1,
  sessionTtlMinutes: 30,
  confirmationThreshold: 6,
  outboxPollIntervalMs: 5000,
  maxRetries: 3,
  lockTtlSeconds: 30,
};
