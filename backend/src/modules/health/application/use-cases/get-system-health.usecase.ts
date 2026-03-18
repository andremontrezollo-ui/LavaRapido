/**
 * GetSystemHealth Use Case
 *
 * Returns the overall health status of the system.
 * Accepts optional external health checkers (e.g., DB connectivity).
 */

import type { SystemHealthResponse } from '../dtos/health.dto';
import type { HealthChecker } from '../ports/health-checker.port';

const APP_VERSION = '1.0.0';

export class GetSystemHealthUseCase {
  private readonly startTime = Date.now();

  constructor(private readonly checkers: HealthChecker[] = []) {}

  async execute(): Promise<SystemHealthResponse> {
    const uptimeSeconds = Math.round((Date.now() - this.startTime) / 1000);
    const now = new Date().toISOString();

    if (this.checkers.length === 0) {
      return { status: 'ok', version: APP_VERSION, uptimeSeconds, timestamp: now };
    }

    const checks: Record<string, { status: string; details?: string }> = {};

    await Promise.all(
      this.checkers.map(async (checker) => {
        try {
          const result = await checker.check();
          checks[checker.name] = { status: result.status, ...(result.details ? { details: result.details } : {}) };
        } catch {
          checks[checker.name] = { status: 'error', details: 'Check threw an exception' };
        }
      }),
    );

    const hasError = Object.values(checks).some((c) => c.status === 'error');
    const hasDegraded = Object.values(checks).some((c) => c.status === 'degraded');

    return {
      status: hasError ? 'error' : hasDegraded ? 'degraded' : 'ok',
      version: APP_VERSION,
      uptimeSeconds,
      timestamp: now,
      checks,
    };
  }
}
