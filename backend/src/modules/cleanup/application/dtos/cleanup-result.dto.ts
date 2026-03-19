export interface CleanupResultDto {
  status: "ok";
  expiredSessions: number;
  deletedRateLimits: number;
  timestamp: string;
}
