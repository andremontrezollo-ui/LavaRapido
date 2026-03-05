/**
 * GenerateAddress Request DTO
 */

import type { NamespacePurpose } from '../../domain/value-objects/address-namespace.vo';
import type { AddressNetwork } from '../../domain/value-objects/bitcoin-address.vo';

export interface GenerateAddressRequest {
  readonly network: AddressNetwork;
  readonly purpose: NamespacePurpose;
  readonly customTtlSeconds?: number;
}
