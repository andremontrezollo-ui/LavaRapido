/**
 * Health API Contracts
 * Defines the stable HTTP response shape for the health endpoint.
 */

/** GET /health or POST /health */
export interface HealthHttpResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime: number;
  timestamp: string;
  checks?: Record<string, { status: string; details?: string }>;
}
