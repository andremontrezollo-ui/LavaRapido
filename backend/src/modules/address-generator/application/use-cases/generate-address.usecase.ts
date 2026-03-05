/**
 * GenerateAddress Use Case
 * 
 * Orchestrates address generation: validates policy, creates entity,
 * persists, and emits domain event.
 */

import { Address } from '../../domain/entities/address.entity';
import { BitcoinAddress } from '../../domain/value-objects/bitcoin-address.vo';
import { AddressNamespace } from '../../domain/value-objects/address-namespace.vo';
import { AddressExpirationPolicy } from '../../domain/policies/address-expiration.policy';
import { AddressGenerationPolicy } from '../../domain/policies/address-generation.policy';
import { createAddressGeneratedEvent } from '../../domain/events/address-generated.event';
import type { GenerateAddressRequest } from '../dtos/generate-address.request';
import type { GenerateAddressResponse } from '../dtos/generate-address.response';
import type { AddressRepository } from '../ports/address-repository.port';
import type { RandomGenerator } from '../ports/random-generator.port';
import type { EventPublisher } from '../../../../shared/ports';

export class GenerateAddressUseCase {
  private readonly expirationPolicy = new AddressExpirationPolicy();
  private readonly generationPolicy = new AddressGenerationPolicy();

  constructor(
    private readonly addressRepo: AddressRepository,
    private readonly randomGenerator: RandomGenerator,
    private readonly eventPublisher: EventPublisher
  ) {}

  async execute(request: GenerateAddressRequest): Promise<GenerateAddressResponse> {
    // Check generation policy
    const activeCount = await this.addressRepo.countActiveByNetwork(request.network);
    const generationCheck = this.generationPolicy.evaluate({
      network: request.network,
      existingActiveCount: activeCount,
    });

    if (!generationCheck.allowed) {
      throw new Error(this.generationPolicy.explain({
        network: request.network,
        existingActiveCount: activeCount,
      }));
    }

    // Generate address
    const id = this.randomGenerator.generateId();
    const now = new Date();
    const prefix = request.network === 'mainnet' ? 'bc1q' : 'tb1q';
    const bytes = this.randomGenerator.generateAddressBytes(32);
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').slice(0, 38);
    const rawAddress = `${prefix}${hex}`;

    const bitcoinAddress = BitcoinAddress.create(rawAddress);
    const namespace = AddressNamespace.create(this.randomGenerator.generateId(), request.purpose);

    // Apply expiration policy
    const expiration = this.expirationPolicy.evaluate({
      purpose: request.purpose,
      createdAt: now,
      customTtlSeconds: request.customTtlSeconds,
    });

    // Create entity
    const address = new Address({
      id,
      address: bitcoinAddress,
      namespace,
      createdAt: now,
      expiresAt: expiration.expiresAt,
      status: 'active',
    });

    // Persist
    await this.addressRepo.save(address);

    // Emit event
    const event = createAddressGeneratedEvent(id, namespace.value, expiration.expiresAt);
    await this.eventPublisher.publish(event);

    return {
      addressId: address.id,
      address: bitcoinAddress.value,
      network: bitcoinAddress.network,
      purpose: namespace.purpose,
      createdAt: now.toISOString(),
      expiresAt: expiration.expiresAt.toISOString(),
      status: address.status,
    };
  }
}
