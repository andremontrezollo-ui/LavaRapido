/**
 * CreateMixSession Use Case
 *
 * Generates a unique deposit address, creates a new mix session, and persists it.
 * The session expires after SESSION_TTL_MINUTES (default: 30 min).
 */

import { MixSession } from '../../domain/entities/mix-session.entity';
import { SessionStatus } from '../../domain/value-objects/session-status.vo';
import { DepositAddress } from '../../domain/value-objects/deposit-address.vo';
import { SessionExpirationPolicy } from '../../domain/policies/session-expiration.policy';
import type { CreateMixSessionRequest, CreateMixSessionResponse } from '../dtos/create-mix-session.dto';
import type { MixSessionRepository } from '../ports/mix-session-repository.port';
import type { AddressGenerator } from '../ports/address-generator.port';

export class CreateMixSessionUseCase {
  private readonly expirationPolicy = new SessionExpirationPolicy();

  constructor(
    private readonly sessionRepo: MixSessionRepository,
    private readonly addressGenerator: AddressGenerator,
    private readonly generateId: () => string,
  ) {}

  async execute(request: CreateMixSessionRequest): Promise<CreateMixSessionResponse> {
    const now = new Date();
    const id = this.generateId();

    const generated = this.addressGenerator.generate('testnet');
    const depositAddress = DepositAddress.fromStorage(generated.value, generated.network);
    const expiresAt = this.expirationPolicy.expiresAt(now);

    const session = new MixSession({
      id,
      depositAddress,
      status: SessionStatus.active(),
      clientFingerprintHash: request.clientFingerprintHash,
      createdAt: now,
      expiresAt,
    });

    await this.sessionRepo.save(session);

    return {
      sessionId: session.id,
      depositAddress: session.depositAddress.value,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      status: session.status.value,
    };
  }
}
