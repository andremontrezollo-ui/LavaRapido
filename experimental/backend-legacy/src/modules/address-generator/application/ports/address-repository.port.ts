/**
 * AddressRepository Port
 * 
 * Persistence abstraction for Address entities.
 */

import type { Address } from '../../domain/entities/address.entity';

export interface AddressRepository {
  save(address: Address): Promise<void>;
  findById(id: string): Promise<Address | null>;
  findActiveByNetwork(network: string): Promise<Address[]>;
  countActiveByNetwork(network: string): Promise<number>;
  markExpired(id: string): Promise<void>;
  findExpired(now: Date): Promise<Address[]>;
}
