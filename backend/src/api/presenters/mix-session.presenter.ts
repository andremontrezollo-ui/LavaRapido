/**
 * MixSession Presenter
 * Maps use-case output DTOs to stable HTTP response contracts.
 */

import type { CreateMixSessionResponse } from '../../modules/mix-session/application/dtos/create-mix-session.dto';
import type { GetMixSessionStatusResponse } from '../../modules/mix-session/application/dtos/get-mix-session-status.dto';
import type { CleanupExpiredSessionsResponse } from '../../modules/mix-session/application/dtos/cleanup-expired-sessions.dto';
import type { CreateMixSessionHttpResponse, GetMixSessionStatusHttpResponse, CleanupHttpResponse } from '../contracts/mix-session.contracts';

export class MixSessionPresenter {
  static toCreateResponse(dto: CreateMixSessionResponse): CreateMixSessionHttpResponse {
    return {
      sessionId: dto.sessionId,
      depositAddress: dto.depositAddress,
      createdAt: dto.createdAt,
      expiresAt: dto.expiresAt,
      status: dto.status,
    };
  }

  static toStatusResponse(dto: GetMixSessionStatusResponse): GetMixSessionStatusHttpResponse {
    return {
      sessionId: dto.sessionId,
      status: dto.status,
      expiresAt: dto.expiresAt,
      createdAt: dto.createdAt,
    };
  }

  static toCleanupResponse(
    dto: CleanupExpiredSessionsResponse,
    deletedRateLimits = 0,
  ): CleanupHttpResponse {
    return {
      status: 'ok',
      expiredSessions: dto.expiredSessions,
      deletedRateLimits,
      timestamp: dto.timestamp,
    };
  }
}
