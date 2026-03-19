/**
 * Use Case: CreateMixSession
 *
 * Orchestrates address generation and session persistence.
 * All domain rules (expiry window, status) are encapsulated here.
 */

import type { Result } from '../../../shared';
import { success, failure } from '../../../shared';
import type { MixSessionRepository } from '../ports/mix-session-repository.port';
import type { AddressGeneratorPort } from '../ports/address-generator.port';
import type { CreateMixSessionRequest } from '../dtos/create-mix-session.request';
import type { MixSessionResponse } from '../dtos/mix-session.response';

const SESSION_TTL_MINUTES = 30;

export class CreateMixSessionUseCase {
  constructor(
    private readonly sessionRepo: MixSessionRepository,
    private readonly addressGenerator: AddressGeneratorPort,
  ) {}

  async execute(request: CreateMixSessionRequest): Promise<Result<MixSessionResponse>> {
    const depositAddress = this.addressGenerator.generateTestnetAddress();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000);

    try {
      const session = await this.sessionRepo.create({
        depositAddress,
        expiresAt,
        clientFingerprintHash: request.clientFingerprintHash,
      });

      return success({
        sessionId: session.id,
        depositAddress: session.depositAddress,
        status: session.status,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
      });
    } catch (err) {
      return failure(err instanceof Error ? err : new Error('Failed to create mix session'));
    }
  }
}
