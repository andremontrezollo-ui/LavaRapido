/**
 * Application Configuration — validated, typed, fail-fast.
 */

export interface AppConfig {
  readonly env: 'development' | 'test' | 'production';
  // Supabase (legacy)
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  // Database
  readonly databaseUrl: string;
  // Redis
  readonly redisUrl: string;
  // JWT
  readonly jwtSecret?: string;
  readonly jwtPublicKey?: string;
  // Rate limiting
  readonly rateLimitMaxRequests: number;
  readonly rateLimitWindowMinutes: number;
  // Logging
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  // Sessions / blockchain
  readonly sessionTtlMinutes: number;
  readonly confirmationThreshold: number;
  // Infrastructure
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
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseServiceRoleKey: '',
  databaseUrl: '',
  redisUrl: '',
};
