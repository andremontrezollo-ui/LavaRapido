/**
 * Health check endpoint.
 */

import { callFunction } from "../client";
import type { ApiResponse } from "../types";

export interface HealthResponse {
  status: string;
  uptime: number;
  version: string;
  timestamp: string;
}

export function getHealthStatus(): Promise<ApiResponse<HealthResponse>> {
  return callFunction<HealthResponse>("health");
}
