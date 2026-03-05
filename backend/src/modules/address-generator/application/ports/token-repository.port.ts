/**
 * TokenRepository Port
 * 
 * Persistence abstraction for AddressToken entities.
 */

import type { AddressToken } from '../../domain/entities/address-token.entity';

export interface TokenRepository {
  save(token: AddressToken): Promise<void>;
  findByTokenId(tokenId: string): Promise<AddressToken | null>;
  findByAddressId(addressId: string): Promise<AddressToken | null>;
  markConsumed(tokenId: string): Promise<void>;
}
