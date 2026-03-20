/**
 * Backend Domain Library — exports shared kernel, infrastructure adapters, and domain modules.
 *
 * HTTP runtime: Supabase Edge Functions (supabase/functions/).
 * This library provides the domain logic consumed by those Edge Functions.
 */

export * from './shared';
export * as infra from './infra';
export * as modules from './modules';
