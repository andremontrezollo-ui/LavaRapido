/**
 * Environment configuration validation
 * Validates required environment variables at startup
 */

const REQUIRED_ENV_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

function getEnvVar(key: RequiredEnvVar): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Check your .env file.`
    );
  }
  return value;
}

/**
 * Validates all required environment variables are present.
 * Call once at app startup to detect misconfiguration early.
 */
export function validateEnv(): void {
  for (const key of REQUIRED_ENV_VARS) {
    getEnvVar(key);
  }
}

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
} as const;
