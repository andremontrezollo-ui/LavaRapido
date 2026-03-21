/**
 * Load and validate configuration.
 * Fails fast if required variables are missing.
 */

import type { AppConfig } from './app-config';
import { validateEnvSchema } from './env.schema';

let cachedConfig: AppConfig | null = null;

export function loadConfig(env?: Record<string, string | undefined>): AppConfig {
  if (cachedConfig) return cachedConfig;

  const source = env ?? (typeof Deno !== 'undefined' ? Deno.env.toObject() : process.env) as Record<string, string | undefined>;
  const result = validateEnvSchema(source);

  if (!result.valid) {
    const msg = `Configuration validation failed:\n${result.errors.map(e => `  - ${e}`).join('\n')}`;
    throw new Error(msg);
  }

  cachedConfig = result.config;
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}
