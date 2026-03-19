/**
 * CreateMixSession Use Case
 *
 * Orchestrates mix session creation: generates a deposit address,
 * applies the expiration policy, persists the session, and emits
 * a domain event.
 */

import { MixSession } from '../../domain/entities/mix-session.entity';
import { SessionExpirationPolicy } from '../../domain/policies/session-expiration.policy';
import { createSessionCreatedEvent } from '../../domain/events/session-created.event';
import type { CreateMixSessionRequest } from '../dtos/create-mix-session.request';
import type { CreateMixSessionResponse } from '../dtos/create-mix-session.response';
import type { MixSessionRepository } from '../ports/mix-session-repository.port';
import type { MixAddressGenerator } from '../ports/address-generator.port';
import type { SessionClock } from '../ports/clock.port';
import type { SessionEventPublisher } from '../ports/event-publisher.port';

export class CreateMixSessionUseCase {
  private readonly expirationPolicy = new SessionExpirationPolicy();

  constructor(
    private readonly sessionRepo: MixSessionRepository,
    private readonly addressGenerator: MixAddressGenerator,
    private readonly clock: SessionClock,
    private readonly publisher: SessionEventPublisher,
  ) {}

  async execute(request: CreateMixSessionRequest): Promise<CreateMixSessionResponse> {
    const id = crypto.randomUUID();
    const now = this.clock.now();
    const depositAddress = this.addressGenerator.generateDepositAddress();
    const { expiresAt } = this.expirationPolicy.evaluate({}, now);

    const session = new MixSession({
      id,
      depositAddress,
      clientFingerprintHash: request.clientFingerprintHash,
      createdAt: now,
      expiresAt,
      status: 'active',
    });

    await this.sessionRepo.save(session);
    await this.publisher.publish(createSessionCreatedEvent(id, expiresAt));

    return {
      sessionId: session.id,
      depositAddress: session.depositAddress,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: session.status,
    };
  }
}
