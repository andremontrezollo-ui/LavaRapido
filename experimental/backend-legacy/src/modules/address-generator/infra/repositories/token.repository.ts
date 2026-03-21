/**
 * InMemoryTokenRepository
 * 
 * In-memory implementation of TokenRepository port for development/testing.
 */

import type { TokenRepository } from '../../application/ports/token-repository.port';
import type { AddressToken } from '../../domain/entities/address-token.entity';

export class InMemoryTokenRepository implements TokenRepository {
  private tokens = new Map<string, AddressToken>();

  async save(token: AddressToken): Promise<void> {
    this.tokens.set(token.tokenId, token);
  }

  async findByTokenId(tokenId: string): Promise<AddressToken | null> {
    return this.tokens.get(tokenId) ?? null;
  }

  async findByAddressId(addressId: string): Promise<AddressToken | null> {
    for (const token of this.tokens.values()) {
      if (token.addressId === addressId) return token;
    }
    return null;
  }

  async markConsumed(tokenId: string): Promise<void> {
    const token = this.tokens.get(tokenId);
    if (token) {
      token.consume();
    }
  }

  clear(): void {
    this.tokens.clear();
  }
}
