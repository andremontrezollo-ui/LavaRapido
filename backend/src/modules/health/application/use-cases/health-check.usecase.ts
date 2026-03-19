import type { HealthResponseDto } from '../dtos/health-response.dto.ts';

const START_TIME = Date.now();

export class HealthCheckUseCase {
  constructor(private readonly version: string = "1.0.0") {}

  execute(): HealthResponseDto {
    return {
      status: "ok",
      uptime: Math.round((Date.now() - START_TIME) / 1000),
      version: this.version,
      timestamp: new Date().toISOString(),
    };
  }
}
