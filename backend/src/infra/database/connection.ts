/**
 * Database connection — reads credentials from environment variables only.
 * No hardcoded credentials. Fails fast if required variables are missing.
 *
 * NOTE: This module is part of the backend domain library.
 * The production HTTP layer uses Supabase Edge Functions (supabase/functions/).
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

export function getDatabaseUrl(): string {
  return requireEnv("DATABASE_URL");
}
