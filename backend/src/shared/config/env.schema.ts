/**
 * Environment Schema Validation — fail fast on missing/invalid config.
 */

import type { AppConfig } from './app-config';
import { DEFAULT_CONFIG } from './app-config';

interface FlatEnvSchema {
  key: string;
  required: boolean;
  type: 'string' | 'number';
  setter: (config: Record<string, unknown>, value: string) => void;
}

const SCHEMA: FlatEnvSchema[] = [
  { key: 'APP_ENV',                    required: false, type: 'string', setter: (c, v) => { c.env = v; } },
  { key: 'SUPABASE_URL',               required: true,  type: 'string', setter: (c, v) => { c.supabaseUrl = v; } },
  { key: 'SUPABASE_ANON_KEY',          required: true,  type: 'string', setter: (c, v) => { c.supabaseAnonKey = v; } },
  { key: 'SUPABASE_SERVICE_ROLE_KEY',  required: true,  type: 'string', setter: (c, v) => { c.supabaseServiceRoleKey = v; } },
  { key: 'LOG_LEVEL',                  required: false, type: 'string', setter: (c, v) => { c.logLevel = v; } },
  { key: 'RATE_LIMIT_MAX_REQUESTS',    required: false, type: 'number', setter: (c, v) => { c.rateLimitMaxRequests = Number(v); } },
  { key: 'RATE_LIMIT_WINDOW_MINUTES',  required: false, type: 'number', setter: (c, v) => { c.rateLimitWindowMinutes = Number(v); } },
  { key: 'SESSION_TTL_MINUTES',        required: false, type: 'number', setter: (c, v) => { c.sessionTtlMinutes = Number(v); } },
  { key: 'CONFIRMATION_THRESHOLD',     required: false, type: 'number', setter: (c, v) => { c.confirmationThreshold = Number(v); } },
  { key: 'OUTBOX_POLL_INTERVAL_MS',    required: false, type: 'number', setter: (c, v) => { c.outboxPollIntervalMs = Number(v); } },
  { key: 'MAX_RETRIES',                required: false, type: 'number', setter: (c, v) => { c.maxRetries = Number(v); } },
  { key: 'LOCK_TTL_SECONDS',           required: false, type: 'number', setter: (c, v) => { c.lockTtlSeconds = Number(v); } },
  { key: 'APP_VERSION',                required: false, type: 'string', setter: (c, v) => { (c.app as Record<string, unknown>).version = v; } },
  { key: 'PORT',                       required: false, type: 'number', setter: (c, v) => { (c.http as Record<string, unknown>).port = Number(v); } },
  { key: 'HOST',                       required: false, type: 'string', setter: (c, v) => { (c.http as Record<string, unknown>).host = v; } },
];

const VALID_ENVS = ['development', 'test', 'production'] as const;
const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

export function validateEnvSchema(env: Record<string, string | undefined>): {
  valid: boolean;
  errors: string[];
  config: AppConfig;
} {
  const errors: string[] = [];
  const config: Record<string, unknown> = {
    ...DEFAULT_CONFIG,
    app: { ...(DEFAULT_CONFIG.app ?? { version: '0.0.0', environment: 'development' }) },
    http: { ...(DEFAULT_CONFIG.http ?? { port: 3000, host: '0.0.0.0' }) },
  };

  for (const field of SCHEMA) {
    const raw = env[field.key];
    if (field.required && (!raw || raw.trim() === '')) {
      errors.push(`Missing required environment variable: ${field.key}`);
      continue;
    }
    if (raw !== undefined && raw.trim() !== '') {
      if (field.type === 'number') {
        const num = Number(raw);
        if (isNaN(num)) {
          errors.push(`${field.key} must be a valid number, got: ${raw}`);
        } else {
          field.setter(config, raw.trim());
        }
      } else {
        field.setter(config, raw.trim());
      }
    }
  }

  if (config.env && !VALID_ENVS.includes(config.env as 'development' | 'test' | 'production')) {
    errors.push(`APP_ENV must be one of: ${VALID_ENVS.join(', ')}`);
  }
  if (config.logLevel && !VALID_LOG_LEVELS.includes(config.logLevel as 'debug' | 'info' | 'warn' | 'error')) {
    errors.push(`LOG_LEVEL must be one of: ${VALID_LOG_LEVELS.join(', ')}`);
  }

  // Sync app.environment with env
  if (config.app && typeof config.env === 'string') {
    (config.app as Record<string, unknown>).environment = config.env;
  }

  return { valid: errors.length === 0, errors, config: config as unknown as AppConfig };
}
