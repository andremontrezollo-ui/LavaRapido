/**
 * Mix Session API Contracts
 * Defines the stable HTTP request/response shapes for mix-session endpoints.
 */

/** POST /mix-sessions — no body required (IP is extracted server-side). */
export interface CreateMixSessionHttpRequest {
  // intentionally empty — the deposit address and session are generated server-side
}

export interface CreateMixSessionHttpResponse {
  sessionId: string;
  depositAddress: string;
  createdAt: string;
  expiresAt: string;
  status: string;
}

/** POST /mix-session-status */
export interface GetMixSessionStatusHttpRequest {
  sessionId: string;
}

export interface GetMixSessionStatusHttpResponse {
  sessionId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

/** POST /cleanup */
export interface CleanupHttpResponse {
  status: 'ok';
  expiredSessions: number;
  deletedRateLimits: number;
  timestamp: string;
}
