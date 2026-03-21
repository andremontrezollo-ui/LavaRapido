/**
 * Mix session endpoints.
 */

import { callFunction } from "../client";
import type { ApiResponse } from "../types";

export interface MixSessionResponse {
  sessionId: string;
  depositAddress: string;
  createdAt: string;
  expiresAt: string;
  status: string;
}

export interface SessionStatusResponse {
  sessionId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export function createMixSession(): Promise<ApiResponse<MixSessionResponse>> {
  return callFunction<MixSessionResponse>("mix-sessions");
}

export function getMixSessionStatus(sessionId: string): Promise<ApiResponse<SessionStatusResponse>> {
  return callFunction<SessionStatusResponse>("mix-session-status", { sessionId });
}
