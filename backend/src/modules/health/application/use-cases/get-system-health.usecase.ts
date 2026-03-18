/**
 * GetSystemHealth — application use case.
 *
 * Returns process uptime, service version, and current timestamp.
 * No persistence or external calls — pure computation.
 */
import type { UseCase } from '../../../../shared/application/UseCase.ts';
import type { HealthStatusResponse } from '../dtos/health-status.dto.ts';

const VERSION = '1.0.0';

export class GetSystemHealthUseCase implements UseCase<void, HealthStatusResponse> {
  private readonly startTime: number;

  constructor(startTime?: number) {
    this.startTime = startTime ?? Date.now();
  }

  async execute(): Promise<HealthStatusResponse> {
    return {
      status: 'ok',
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      version: VERSION,
      timestamp: new Date().toISOString(),
    };
  }
}
