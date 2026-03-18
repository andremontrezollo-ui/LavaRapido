/**
 * mix-session module — public API.
 *
 * Consumers (Edge Functions, Node.js controllers, tests) should import
 * only from this file, never from internal paths.
 */

// Domain
export {
  SESSION_EXPIRY_MINUTES,
  generateTestnetAddress,
  isSessionExpired,
} from './domain/MixSession.ts';
export type { MixSession, MixSessionStatus } from './domain/MixSession.ts';

// Ports
export type { MixSessionRepository } from './application/ports/MixSessionRepository.ts';

// Use cases
export {
  CreateMixSessionUseCase,
  CreateMixSessionError,
} from './application/use-cases/CreateMixSession.ts';
export type {
  CreateMixSessionInput,
  CreateMixSessionOutput,
} from './application/use-cases/CreateMixSession.ts';

export {
  GetMixSessionStatusUseCase,
  GetMixSessionStatusError,
} from './application/use-cases/GetMixSessionStatus.ts';
export type {
  GetMixSessionStatusInput,
  GetMixSessionStatusOutput,
} from './application/use-cases/GetMixSessionStatus.ts';

export { CleanupExpiredSessionsUseCase } from './application/use-cases/CleanupExpiredSessions.ts';
export type { CleanupExpiredSessionsOutput } from './application/use-cases/CleanupExpiredSessions.ts';
