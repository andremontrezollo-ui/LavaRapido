/**
 * mix-session module public API
 *
 * Import from this index to use the mix-session module.
 * Do NOT import from internal paths directly.
 */

// Domain
export { MixSession } from './domain/entities/mix-session.entity';
export type { MixSessionProps } from './domain/entities/mix-session.entity';
export { SessionStatus } from './domain/value-objects/session-status.vo';
export type { SessionStatusValue } from './domain/value-objects/session-status.vo';
export { DepositAddress } from './domain/value-objects/deposit-address.vo';
export type { AddressNetwork } from './domain/value-objects/deposit-address.vo';
export { SessionExpirationPolicy, SESSION_TTL_MINUTES } from './domain/policies/session-expiration.policy';
export { createMixSessionCreatedEvent } from './domain/events/mix-session-created.event';
export type { MixSessionCreatedEvent } from './domain/events/mix-session-created.event';

// Application — Use Cases
export { CreateMixSessionUseCase } from './application/use-cases/create-mix-session.usecase';
export { GetMixSessionStatusUseCase, SessionNotFoundError } from './application/use-cases/get-mix-session-status.usecase';
export { CleanupExpiredSessionsUseCase } from './application/use-cases/cleanup-expired-sessions.usecase';

// Application — DTOs
export type { CreateMixSessionRequest, CreateMixSessionResponse } from './application/dtos/create-mix-session.dto';
export type { GetMixSessionStatusRequest, GetMixSessionStatusResponse } from './application/dtos/get-mix-session-status.dto';
export type { CleanupExpiredSessionsResponse } from './application/dtos/cleanup-expired-sessions.dto';

// Application — Ports
export type { MixSessionRepository } from './application/ports/mix-session-repository.port';
export type { AddressGenerator, GeneratedAddress } from './application/ports/address-generator.port';
