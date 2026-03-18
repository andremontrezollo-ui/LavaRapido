/**
 * Supabase client factory — Node.js.
 *
 * Returns a singleton Supabase client initialised from environment variables.
 * Requires:
 *   SUPABASE_URL            — project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (server-side only, never expose to client)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'Environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.',
      );
    }

    _client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  return _client;
}

/** Reset the singleton (useful in tests). */
export function resetSupabaseClient(): void {
  _client = null;
}
