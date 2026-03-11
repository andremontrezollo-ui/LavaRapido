/**
 * Dependency Container — interface for production and test containers.
 */

export interface ReadinessCheck {
  isReady: boolean;
  status: string;
  checks: Record<string, { status: string; details?: string; latencyMs?: number }>;
  uptime: number;
  timestamp: string;
}

export interface DependencyContainer {
  readinessCheck(): Promise<ReadinessCheck>;
  dispose(): Promise<void>;
}
