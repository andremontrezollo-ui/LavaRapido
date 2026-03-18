/**
 * CreateMixSession — use case.
 *
 * Business rules:
 *  - Rate limit: max 10 sessions per 10 minutes per IP hash.
 *  - Session expires in SESSION_EXPIRY_MINUTES minutes.
 *  - Deposit address is a freshly generated testnet address.
 */

import { generateTestnetAddress, SESSION_EXPIRY_MINUTES } from '../../domain/MixSession.ts';
import type { MixSessionRepository } from '../ports/MixSessionRepository.ts';
import type { RateLimitRepository } from '../../../../shared/ports/RateLimitRepository.ts';

export interface CreateMixSessionInput {
  /** SHA-256 hash of the client IP address. */
  ipHash: string;
}

export interface CreateMixSessionOutput {
  sessionId: string;
  depositAddress: string;
  createdAt: string;
  expiresAt: string;
  status: string;
}

export class CreateMixSessionError extends Error {
  constructor(
    public readonly code: 'RATE_LIMITED' | 'INTERNAL',
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'CreateMixSessionError';
  }
}

/** Rate-limit config for session creation. */
const RATE_LIMIT_CONFIG = {
  endpoint: 'mix-sessions',
  maxRequests: 10,
  windowSeconds: 600,
} as const;

export class CreateMixSessionUseCase {
  constructor(
    private readonly sessions: MixSessionRepository,
    private readonly rateLimits: RateLimitRepository,
  ) {}

  async execute(input: CreateMixSessionInput): Promise<CreateMixSessionOutput> {
    const rl = await this.rateLimits.check(input.ipHash, RATE_LIMIT_CONFIG);

    if (!rl.allowed) {
      throw new CreateMixSessionError(
        'RATE_LIMITED',
        'Rate limit exceeded',
        rl.retryAfterSeconds,
      );
    }

    await this.rateLimits.record(input.ipHash, RATE_LIMIT_CONFIG.endpoint);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_MINUTES * 60 * 1000);

    const session = await this.sessions.save({
      depositAddress: generateTestnetAddress(),
      status: 'active',
      expiresAt,
      createdAt: now,
      clientFingerprintHash: input.ipHash,
    });

    return {
      sessionId: session.id,
      depositAddress: session.depositAddress,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      status: session.status,
    };
  }
}
