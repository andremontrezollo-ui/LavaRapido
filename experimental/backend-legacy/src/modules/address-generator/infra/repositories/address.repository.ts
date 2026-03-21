/**
 * InMemoryAddressRepository
 * 
 * In-memory implementation of AddressRepository port for development/testing.
 */

import type { AddressRepository } from '../../application/ports/address-repository.port';
import type { Address } from '../../domain/entities/address.entity';

export class InMemoryAddressRepository implements AddressRepository {
  private addresses = new Map<string, Address>();

  async save(address: Address): Promise<void> {
    this.addresses.set(address.id, address);
  }

  async findById(id: string): Promise<Address | null> {
    return this.addresses.get(id) ?? null;
  }

  async findActiveByNetwork(network: string): Promise<Address[]> {
    const now = new Date();
    return Array.from(this.addresses.values()).filter(
      a => a.address.network === network && a.isActive(now)
    );
  }

  async countActiveByNetwork(network: string): Promise<number> {
    return (await this.findActiveByNetwork(network)).length;
  }

  async markExpired(id: string): Promise<void> {
    const address = this.addresses.get(id);
    if (address) {
      address.markExpired();
    }
  }

  async findExpired(now: Date): Promise<Address[]> {
    return Array.from(this.addresses.values()).filter(a => a.isExpired(now));
  }

  clear(): void {
    this.addresses.clear();
  }
}
