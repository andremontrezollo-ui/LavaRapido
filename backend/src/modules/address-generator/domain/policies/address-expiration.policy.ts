/**
 * Address Expiration Policy
 * 
 * Pure business rule: determines TTL for generated addresses based on namespace purpose.
 */

import type { ExplainablePolicy } from '../../../../shared/policies';
import type { NamespacePurpose } from '../value-objects/address-namespace.vo';

export interface ExpirationInput {
  purpose: NamespacePurpose;
  createdAt: Date;
  customTtlSeconds?: number;
}

export interface ExpirationResult {
  expiresAt: Date;
  ttlSeconds: number;
}

const DEFAULT_TTL: Record<NamespacePurpose, number> = {
  deposit: 1800,     // 30 minutes
  withdrawal: 3600,  // 1 hour
  internal: 86400,   // 24 hours
};

export class AddressExpirationPolicy implements ExplainablePolicy<ExpirationInput, ExpirationResult> {
  evaluate(input: ExpirationInput): ExpirationResult {
    const ttlSeconds = input.customTtlSeconds ?? DEFAULT_TTL[input.purpose];
    const expiresAt = new Date(input.createdAt.getTime() + ttlSeconds * 1000);
    return { expiresAt, ttlSeconds };
  }

  explain(input: ExpirationInput): string {
    const r = this.evaluate(input);
    return `Address for '${input.purpose}' expires after ${r.ttlSeconds}s (at ${r.expiresAt.toISOString()}).`;
  }
}
