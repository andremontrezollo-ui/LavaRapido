/**
 * Environment Schema Validation — fail fast on missing/invalid config.
 */

import type { AppConfig } from './app-config';
import { DEFAULT_CONFIG } from './app-config';

interface EnvSchema {
  key: string;
  required: boolean;
  type: 'string' | 'number';
  configKey: keyof AppConfig;
}

const SCHEMA: EnvSchema[] = [
  { key: 'APP_ENV', required: false, type: 'string', configKey: 'env' },
  { key: 'SUPABASE_URL', required: true, type: 'string', configKey: 'supabaseUrl' },
  { key: 'SUPABASE_ANON_KEY', required: true, type: 'string', configKey: 'supabaseAnonKey' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', required: true, type: 'string', configKey: 'supabaseServiceRoleKey' },
  { key: 'LOG_LEVEL', required: false, type: 'string', configKey: 'logLevel' },
  { key: 'RATE_LIMIT_MAX_REQUESTS', required: false, type: 'number', configKey: 'rateLimitMaxRequests' },
  { key: 'RATE_LIMIT_WINDOW_MINUTES', required: false, type: 'number', configKey: 'rateLimitWindowMinutes' },
  { key: 'SESSION_TTL_MINUTES', required: false, type: 'number', configKey: 'sessionTtlMinutes' },
  { key: 'CONFIRMATION_THRESHOLD', required: false, type: 'number', configKey: 'confirmationThreshold' },
  { key: 'OUTBOX_POLL_INTERVAL_MS', required: false, type: 'number', configKey: 'outboxPollIntervalMs' },
  { key: 'MAX_RETRIES', required: false, type: 'number', configKey: 'maxRetries' },
  { key: 'LOCK_TTL_SECONDS', required: false, type: 'number', configKey: 'lockTtlSeconds' },
];

const VALID_ENVS = ['development', 'test', 'production'] as const;
const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

export function validateEnvSchema(env: Record<string, string | undefined>): {
  valid: boolean;
  errors: string[];
  config: AppConfig;
} {
  const errors: string[] = [];
  const config: Record<string, unknown> = { ...DEFAULT_CONFIG };

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
          config[field.configKey] = num;
        }
      } else {
        config[field.configKey] = raw.trim();
      }
    }
  }

  if (config.env && !VALID_ENVS.includes(config.env as any)) {
    errors.push(`APP_ENV must be one of: ${VALID_ENVS.join(', ')}`);
  }
  if (config.logLevel && !VALID_LOG_LEVELS.includes(config.logLevel as any)) {
    errors.push(`LOG_LEVEL must be one of: ${VALID_LOG_LEVELS.join(', ')}`);
  }

  return { valid: errors.length === 0, errors, config: config as AppConfig };
}
