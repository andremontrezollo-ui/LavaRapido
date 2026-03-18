/**
 * Dependencies — concrete implementations of ports wired to external services.
 *
 * TODO: Replace in-memory implementations with real Supabase/PostgreSQL adapters
 * as the infrastructure matures.
 */

import type { MixSessionRepository } from '../modules/mix-session/application/ports/mix-session-repository.port';
import type { AddressGenerator, GeneratedAddress } from '../modules/mix-session/application/ports/address-generator.port';
import type { ContactRepository, SavedTicket } from '../modules/contact/application/ports/contact-repository.port';
import { MixSession } from '../modules/mix-session/domain/entities/mix-session.entity';
import { SessionStatus } from '../modules/mix-session/domain/value-objects/session-status.vo';
import { DepositAddress } from '../modules/mix-session/domain/value-objects/deposit-address.vo';

// ---------------------------------------------------------------------------
// In-memory MixSession repository (for local dev / tests)
// ---------------------------------------------------------------------------

const TESTNET_CHARSET = '0123456789abcdefghijklmnopqrstuvwxyz';

export class TestnetAddressGenerator implements AddressGenerator {
  generate(_network: 'testnet' | 'mainnet'): GeneratedAddress {
    const body = new Uint8Array(38);
    globalThis.crypto.getRandomValues(body);
    const encoded = Array.from(body, (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]).join('');
    return { value: `tb1q${encoded.slice(0, 38)}`, network: 'testnet' };
  }
}

export class InMemoryMixSessionRepository implements MixSessionRepository {
  private readonly store = new Map<string, MixSession>();

  async save(session: MixSession): Promise<void> {
    this.store.set(session.id, session);
  }

  async findById(id: string): Promise<MixSession | null> {
    return this.store.get(id) ?? null;
  }

  async markExpiredSessions(now: Date): Promise<number> {
    let count = 0;
    for (const session of this.store.values()) {
      if (session.status.isActive() && session.isExpiredAt(now)) {
        session.markExpired();
        count++;
      }
    }
    return count;
  }

  async updateStatusToExpired(id: string): Promise<void> {
    const session = this.store.get(id);
    if (session) session.markExpired();
  }
}

// ---------------------------------------------------------------------------
// In-memory Contact repository (for local dev / tests)
// ---------------------------------------------------------------------------

export class InMemoryContactRepository implements ContactRepository {
  async save(data: {
    ticketId: string;
    subject: string;
    message: string;
    replyContact: string | null;
    ipHash: string;
    createdAt: Date;
  }): Promise<SavedTicket> {
    return { ticketId: data.ticketId, createdAt: data.createdAt.toISOString() };
  }
}
