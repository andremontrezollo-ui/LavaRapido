/**
 * SessionExpirationPolicy
 *
 * Determines when a mix session should expire.
 * Default TTL is 30 minutes, matching the edge function behaviour.
 */

export interface SessionExpirationConfig {
  ttlSeconds?: number;
}

export interface ExpirationResult {
  expiresAt: Date;
}

export class SessionExpirationPolicy {
  private readonly DEFAULT_TTL_SECONDS = 30 * 60; // 30 minutes

  evaluate(config: SessionExpirationConfig, createdAt: Date): ExpirationResult {
    const ttl = config.ttlSeconds ?? this.DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(createdAt.getTime() + ttl * 1000);
    return { expiresAt };
  }
}
