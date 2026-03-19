import type { MixSessionRepositoryPort } from '../ports/mix-session-repository.port.ts';
import type { CreateSessionDto, CreateSessionResultDto } from '../dtos/create-session.dto.ts';
import { generateMockTestnetAddress, generateUuid } from '../../../../shared/utils/id-generator.ts';

const DEFAULT_TTL_MINUTES = 30;

export class CreateMixSessionUseCase {
  constructor(private readonly sessions: MixSessionRepositoryPort) {}

  async execute(dto: CreateSessionDto): Promise<CreateSessionResultDto> {
    const id = generateUuid();
    const depositAddress = generateMockTestnetAddress();
    const ttlMinutes = dto.ttlMinutes ?? DEFAULT_TTL_MINUTES;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    const session = await this.sessions.create({
      id,
      depositAddress,
      status: "active",
      expiresAt,
      clientFingerprintHash: dto.clientFingerprintHash,
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
