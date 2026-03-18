/**
 * Supabase client factory.
 *
 * Creates a Supabase admin client using environment variables available
 * in both Edge Function (Deno.env) and Node.js (process.env) runtimes.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getEnv(key: string): string {
  if (typeof Deno !== 'undefined') {
    return Deno.env.get(key) ?? '';
  }
  return (typeof process !== 'undefined' && process.env[key]) ? process.env[key]! : '';
}

export function createSupabaseAdminClient() {
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, key);
}
