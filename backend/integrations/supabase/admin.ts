/**
 * Supabase admin client — SERVER-SIDE ONLY.
 *
 * Uses the SERVICE_ROLE key which bypasses Row Level Security.
 * MUST NOT be imported from any frontend code.
 * MUST NOT be exposed to the client.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function requireEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value || value.trim() === "") {
    throw new Error(`Missing required server environment variable: ${key}`);
  }
  return value.trim();
}

export function createAdminClient() {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
