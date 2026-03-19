export interface HealthResponseDto {
  status: "ok";
  uptime: number;
  version: string;
  timestamp: string;
}
