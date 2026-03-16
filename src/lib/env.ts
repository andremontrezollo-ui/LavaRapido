/**
 * Environment variable validation.
 *
 * Reads required VITE_ prefixed variables and fails fast with a clear
 * message when any of them are missing, instead of producing cryptic
 * runtime errors deeper in the application.
 *
 * NOTE: All VITE_ variables are embedded in the client bundle at build
 * time and are therefore PUBLIC. Never place private keys, service-role
 * tokens, or any sensitive server-side secret in this file.
 */

const REQUIRED_ENV_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

function validateEnv(): Record<RequiredEnvVar, string> {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = import.meta.env[key];
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n\n` +
        "Copy .env.example to .env and fill in the required values."
    );
  }

  return Object.fromEntries(
    REQUIRED_ENV_VARS.map((key) => [key, import.meta.env[key] as string])
  ) as Record<RequiredEnvVar, string>;
}

export const env = validateEnv();
