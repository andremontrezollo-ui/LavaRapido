/**
 * IssueAddressToken Use Case
 * 
 * Issues a one-time token bound to an existing address.
 */

import { AddressToken } from '../../domain/entities/address-token.entity';
import { AddressExpiredError } from '../../domain/errors/address-expired.error';
import { createTokenIssuedEvent } from '../../domain/events/token-issued.event';
import type { AddressRepository } from '../ports/address-repository.port';
import type { TokenRepository } from '../ports/token-repository.port';
import type { RandomGenerator } from '../ports/random-generator.port';
import type { EventPublisher } from '../../../../shared/ports';

export interface IssueTokenRequest {
  readonly addressId: string;
}

export interface IssueTokenResponse {
  readonly tokenId: string;
  readonly address: string;
  readonly expiresAt: string;
}

export class IssueAddressTokenUseCase {
  constructor(
    private readonly addressRepo: AddressRepository,
    private readonly tokenRepo: TokenRepository,
    private readonly randomGenerator: RandomGenerator,
    private readonly eventPublisher: EventPublisher
  ) {}

  async execute(request: IssueTokenRequest): Promise<IssueTokenResponse> {
    const address = await this.addressRepo.findById(request.addressId);

    if (!address) {
      throw new Error(`Address not found: ${request.addressId}`);
    }

    if (address.isExpired()) {
      throw new AddressExpiredError(request.addressId);
    }

    const token = new AddressToken({
      tokenId: this.randomGenerator.generateId(),
      addressId: address.id,
      address: address.address.value,
      createdAt: new Date(),
      expiresAt: address.expiresAt,
      isConsumed: false,
    });

    await this.tokenRepo.save(token);

    const event = createTokenIssuedEvent(token.tokenId);
    await this.eventPublisher.publish(event);

    return {
      tokenId: token.tokenId,
      address: token.address,
      expiresAt: token.expiresAt.toISOString(),
    };
  }
}
