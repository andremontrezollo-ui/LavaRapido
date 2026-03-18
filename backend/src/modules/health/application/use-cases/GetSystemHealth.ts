/**
 * GetSystemHealth — use case.
 *
 * Returns a standardised health payload. No I/O is performed.
 * The use-case instance tracks its own start time so `uptime` is stable.
 */

export interface GetSystemHealthOutput {
  status: 'ok';
  uptime: number;
  version: string;
  timestamp: string;
}

export class GetSystemHealthUseCase {
  private readonly startTime: number;

  constructor(private readonly version: string = '1.0.0') {
    this.startTime = Date.now();
  }

  execute(): GetSystemHealthOutput {
    return {
      status: 'ok',
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      version: this.version,
      timestamp: new Date().toISOString(),
    };
  }
}
