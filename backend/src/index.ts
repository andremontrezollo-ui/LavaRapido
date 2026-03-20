/**
 * Backend Domain Library — exports domain and infrastructure layers.
 *
 * This package is a pure domain library (Clean Architecture + DDD).
 * It contains no HTTP server. The official HTTP runtime is Supabase Edge
 * Functions (supabase/functions/). Domain modules here can be imported by
 * Edge Functions as needed.
 */

export * from './shared';
export * as infra from './infra';
export * as modules from './modules';
