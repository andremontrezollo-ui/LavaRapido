/**
 * AddressMapper
 * 
 * Maps between domain entities and persistence/DTO representations.
 */

import { Address } from '../../domain/entities/address.entity';
import type { AddressStatus } from '../../domain/entities/address.entity';
import { BitcoinAddress } from '../../domain/value-objects/bitcoin-address.vo';
import { AddressNamespace } from '../../domain/value-objects/address-namespace.vo';
import type { NamespacePurpose } from '../../domain/value-objects/address-namespace.vo';

export interface AddressRecord {
  id: string;
  address: string;
  namespace_value: string;
  namespace_purpose: string;
  created_at: string;
  expires_at: string;
  status: string;
}

export class AddressMapper {
  static toDomain(record: AddressRecord): Address {
    return new Address({
      id: record.id,
      address: BitcoinAddress.create(record.address),
      namespace: AddressNamespace.create(record.namespace_value, record.namespace_purpose as NamespacePurpose),
      createdAt: new Date(record.created_at),
      expiresAt: new Date(record.expires_at),
      status: record.status as AddressStatus,
    });
  }

  static toPersistence(address: Address): AddressRecord {
    return {
      id: address.id,
      address: address.address.value,
      namespace_value: address.namespace.value,
      namespace_purpose: address.namespace.purpose,
      created_at: address.createdAt.toISOString(),
      expires_at: address.expiresAt.toISOString(),
      status: address.status,
    };
  }
}
