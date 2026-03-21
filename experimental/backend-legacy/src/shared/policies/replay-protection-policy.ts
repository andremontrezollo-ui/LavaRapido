/**
 * Replay Protection — prevents processing of stale or replayed events.
 */

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
}
