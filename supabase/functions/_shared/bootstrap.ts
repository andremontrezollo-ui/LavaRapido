/**
 * Bootstrap — initialises the Supabase client for Edge Functions.
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from Deno environment.
 * These are injected automatically by the Supabase runtime.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

let _client: SupabaseClient | null = null;

/** Returns a singleton Supabase service-role client. */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  return _client;
}
