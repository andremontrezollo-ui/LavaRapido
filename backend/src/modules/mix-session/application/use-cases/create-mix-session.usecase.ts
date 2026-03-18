/**
 * CreateMixSession — application use case.
 *
 * Business rules:
 * - Rate limit: max 10 sessions per 10 minutes per IP fingerprint
 * - Deposit address: mock testnet address (tb1q + 38 random alphanumeric chars)
 * - Session TTL: 30 minutes
 */
import type { UseCase } from '../../../../shared/application/UseCase.ts';
import type { MixSessionRepository } from '../ports/mix-session-repository.port.ts';
import type { RateLimitRepository } from '../ports/rate-limit-repository.port.ts';
import type { CreateMixSessionRequest, CreateMixSessionResponse } from '../dtos/create-mix-session.dto.ts';
import { sha256Hex } from '../../../../shared/utils/crypto.ts';

const RATE_LIMIT = { endpoint: 'mix-sessions', maxRequests: 10, windowSeconds: 600 };
const SESSION_TTL_MS = 30 * 60 * 1000;
const TESTNET_CHARSET = '0123456789abcdefghijklmnopqrstuvwxyz';

function generateTestnetAddress(): string {
  const body = new Uint8Array(38);
  crypto.getRandomValues(body);
  const encoded = Array.from(body, (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]).join('');
  return `tb1q${encoded.slice(0, 38)}`;
}

export class RateLimitExceededError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super('Rate limit exceeded');
    this.name = 'RateLimitExceededError';
  }
}

export class CreateMixSessionUseCase implements UseCase<CreateMixSessionRequest, CreateMixSessionResponse> {
  constructor(
    private readonly sessionRepo: MixSessionRepository,
    private readonly rateLimitRepo: RateLimitRepository,
  ) {}

  async execute(request: CreateMixSessionRequest): Promise<CreateMixSessionResponse> {
    const ipHash = await sha256Hex(request.clientIp);

    const rl = await this.rateLimitRepo.check(ipHash, RATE_LIMIT);
    if (!rl.allowed) {
      throw new RateLimitExceededError(rl.retryAfterSeconds);
    }

    await this.rateLimitRepo.record(ipHash, RATE_LIMIT.endpoint);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const depositAddress = generateTestnetAddress();

    const session = await this.sessionRepo.create({
      depositAddress,
      status: 'active',
      createdAt: now,
      expiresAt,
      clientFingerprintHash: ipHash,
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
