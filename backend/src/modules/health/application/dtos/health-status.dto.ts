export interface HealthStatusResponse {
  status: 'ok';
  uptime: number;
  version: string;
  timestamp: string;
}
