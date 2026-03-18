/** DTO for GetSystemHealth output */
export interface SystemHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  checks?: Record<string, { status: string; details?: string }>;
}
