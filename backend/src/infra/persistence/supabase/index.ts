/**
 * Supabase persistence layer — public exports.
 */
export { createSupabaseAdminClient } from './client.ts';
export { SupabaseMixSessionRepository } from './repositories/mix-session.repository.ts';
export { SupabaseContactRepository } from './repositories/contact.repository.ts';
export { SupabaseRateLimitRepository } from './repositories/rate-limit.repository.ts';
