/**
 * Dependency Container — holds and wires application dependencies.
 */

export interface ReadinessCheckResult {
  isReady: boolean;
  checks: Record<string, { status: string; details?: string }>;
}

export interface DependencyContainer {
  readinessCheck(): Promise<ReadinessCheckResult>;
}
