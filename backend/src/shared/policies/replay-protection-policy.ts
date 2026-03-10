/**
 * Replay Protection — prevents processing of stale or replayed events.
 * Supports HMAC-based signature verification for critical endpoints.
 */

import { createHmac } from 'crypto';

export interface ReplayProtectionConfig {
  maxAgeSeconds: number;
  allowedClockSkewSeconds: number;
}

const DEFAULT_CONFIG: ReplayProtectionConfig = {
  maxAgeSeconds: 300,
  allowedClockSkewSeconds: 30,
};

export class ReplayProtectionPolicy {
  private readonly config: ReplayProtectionConfig;

  constructor(config: Partial<ReplayProtectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  isValid(eventTimestamp: Date, now: Date = new Date()): { valid: boolean; reason?: string } {
    const ageMs = now.getTime() - eventTimestamp.getTime();
    const futureMs = eventTimestamp.getTime() - now.getTime();

    if (futureMs > this.config.allowedClockSkewSeconds * 1000) {
      return { valid: false, reason: 'Event timestamp is in the future beyond allowed skew' };
    }

    if (ageMs > this.config.maxAgeSeconds * 1000) {
      return { valid: false, reason: `Event is older than ${this.config.maxAgeSeconds}s` };
    }

    return { valid: true };
  }

  /**
   * Compute an HMAC-SHA256 signature for replay-safe request identification.
   * Uses: HMAC(secret, "<messageId>:<timestamp>:<payload>")
   */
  computeHmac(secret: string, messageId: string, timestamp: string, payload: string): string {
    return createHmac('sha256', secret)
      .update(`${messageId}:${timestamp}:${payload}`)
      .digest('hex');
  }

  /**
   * Verify an HMAC signature in constant time to prevent timing attacks.
   */
  verifyHmac(
    secret: string,
    messageId: string,
    timestamp: string,
    payload: string,
    signature: string,
  ): boolean {
    const expected = this.computeHmac(secret, messageId, timestamp, payload);
    if (expected.length !== signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  }
}
