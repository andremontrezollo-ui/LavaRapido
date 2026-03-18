/**
 * Application Config
 *
 * Centralises all configuration values read from environment variables.
 * Add defaults that are safe for local development.
 */

export interface AppConfig {
  app: {
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  http: {
    port: number;
    host: string;
  };
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export function loadConfig(): AppConfig {
  return {
    app: {
      version: optionalEnv('APP_VERSION', '1.0.0'),
      environment: (optionalEnv('NODE_ENV', 'development') as AppConfig['app']['environment']),
    },
    http: {
      port: parseInt(optionalEnv('PORT', '3000'), 10),
      host: optionalEnv('HOST', '0.0.0.0'),
    },
    supabase: {
      url: requireEnv('SUPABASE_URL'),
      serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    },
  };
}
