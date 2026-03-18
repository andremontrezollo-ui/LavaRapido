/**
 * Health Presenter
 * Maps use-case output DTOs to stable HTTP response contracts.
 */

import type { SystemHealthResponse } from '../../modules/health/application/dtos/health.dto';
import type { HealthHttpResponse } from '../contracts/health.contracts';

export class HealthPresenter {
  static toResponse(dto: SystemHealthResponse): HealthHttpResponse {
    return {
      status: dto.status,
      version: dto.version,
      uptime: dto.uptimeSeconds,
      timestamp: dto.timestamp,
      ...(dto.checks ? { checks: dto.checks } : {}),
    };
  }
}
