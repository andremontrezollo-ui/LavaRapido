/**
 * bootstrap/container.ts — Dependency Injection container.
 *
 * Wires together use cases and their infrastructure implementations.
 * Call `buildContainer(deps)` with concrete repository implementations
 * to obtain a ready-to-use set of use cases.
 *
 * Usage (Node.js):
 *   import { buildContainer } from './bootstrap/container';
 *   import { SupabaseMixSessionRepository } from './infra/persistence/supabase/repositories/SupabaseMixSessionRepository';
 *   import { SupabaseContactRepository }    from './infra/persistence/supabase/repositories/SupabaseContactRepository';
 *   import { SupabaseRateLimitRepository }  from './infra/persistence/supabase/repositories/SupabaseRateLimitRepository';
 *   import { getSupabaseClient } from './infra/persistence/supabase/client';
 *
 *   const client  = getSupabaseClient();
 *   const container = buildContainer({
 *     mixSessionRepo: new SupabaseMixSessionRepository(client),
 *     contactRepo:    new SupabaseContactRepository(client),
 *     rateLimitRepo:  new SupabaseRateLimitRepository(client),
 *   });
 */

import { CreateMixSessionUseCase } from '../modules/mix-session/application/use-cases/CreateMixSession.ts';
import { GetMixSessionStatusUseCase } from '../modules/mix-session/application/use-cases/GetMixSessionStatus.ts';
import { CleanupExpiredSessionsUseCase } from '../modules/mix-session/application/use-cases/CleanupExpiredSessions.ts';
import { SubmitContactMessageUseCase } from '../modules/contact/application/use-cases/SubmitContactMessage.ts';
import { GetSystemHealthUseCase } from '../modules/health/application/use-cases/GetSystemHealth.ts';
import type { MixSessionRepository } from '../modules/mix-session/application/ports/MixSessionRepository.ts';
import type { ContactRepository } from '../modules/contact/application/ports/ContactRepository.ts';
import type { RateLimitRepository } from '../shared/ports/RateLimitRepository.ts';

export interface ContainerDependencies {
  mixSessionRepo: MixSessionRepository;
  contactRepo: ContactRepository;
  rateLimitRepo: RateLimitRepository;
}

export interface Container {
  createMixSession: CreateMixSessionUseCase;
  getMixSessionStatus: GetMixSessionStatusUseCase;
  cleanupExpiredSessions: CleanupExpiredSessionsUseCase;
  submitContactMessage: SubmitContactMessageUseCase;
  getSystemHealth: GetSystemHealthUseCase;
}

/**
 * Build and return a fully-wired Container.
 * Repositories are injected so that the use cases remain decoupled from infra.
 */
export function buildContainer(deps: ContainerDependencies): Container {
  return {
    createMixSession: new CreateMixSessionUseCase(deps.mixSessionRepo, deps.rateLimitRepo),
    getMixSessionStatus: new GetMixSessionStatusUseCase(deps.mixSessionRepo),
    cleanupExpiredSessions: new CleanupExpiredSessionsUseCase(deps.mixSessionRepo, deps.rateLimitRepo),
    submitContactMessage: new SubmitContactMessageUseCase(deps.contactRepo, deps.rateLimitRepo),
    getSystemHealth: new GetSystemHealthUseCase(),
  };
}
