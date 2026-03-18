/**
 * Application Container
 *
 * Single-instance dependency container that wires the application.
 * Edge Functions use their own container in supabase/functions/_shared/container.ts
 * because they run in Deno and connect directly to Supabase.
 */

import { CreateMixSessionUseCase } from '../modules/mix-session/application/use-cases/create-mix-session.usecase';
import { GetMixSessionStatusUseCase } from '../modules/mix-session/application/use-cases/get-mix-session-status.usecase';
import { CleanupExpiredSessionsUseCase } from '../modules/mix-session/application/use-cases/cleanup-expired-sessions.usecase';
import { SubmitContactMessageUseCase } from '../modules/contact/application/use-cases/submit-contact-message.usecase';
import { GetSystemHealthUseCase } from '../modules/health/application/use-cases/get-system-health.usecase';
import {
  TestnetAddressGenerator,
  InMemoryMixSessionRepository,
  InMemoryContactRepository,
} from './dependencies';

export interface AppContainer {
  createMixSession: CreateMixSessionUseCase;
  getMixSessionStatus: GetMixSessionStatusUseCase;
  cleanupExpiredSessions: CleanupExpiredSessionsUseCase;
  submitContactMessage: SubmitContactMessageUseCase;
  getSystemHealth: GetSystemHealthUseCase;
}

let _container: AppContainer | null = null;

/**
 * Returns the singleton application container.
 * Call once at startup; subsequent calls return the same instance.
 *
 * TODO: Replace in-memory dependencies with real infrastructure adapters
 * (Supabase, Redis, etc.) once the infrastructure layer is wired.
 */
export function getContainer(): AppContainer {
  if (_container) return _container;

  const sessionRepo = new InMemoryMixSessionRepository();
  const addressGenerator = new TestnetAddressGenerator();
  const contactRepo = new InMemoryContactRepository();

  _container = {
    createMixSession: new CreateMixSessionUseCase(
      sessionRepo,
      addressGenerator,
      () => globalThis.crypto.randomUUID(),
    ),
    getMixSessionStatus: new GetMixSessionStatusUseCase(sessionRepo),
    cleanupExpiredSessions: new CleanupExpiredSessionsUseCase(sessionRepo),
    submitContactMessage: new SubmitContactMessageUseCase(
      contactRepo,
      (arr) => { globalThis.crypto.getRandomValues(arr); return arr; },
    ),
    getSystemHealth: new GetSystemHealthUseCase([]),
  };

  return _container;
}

/** Reset the container (useful for testing). */
export function resetContainer(): void {
  _container = null;
}
