/**
 * LogLevel Value Object
 */

export type LogLevelType = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export class LogLevel {
  private static readonly order: Record<LogLevelType, number> = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 };

  private constructor(readonly value: LogLevelType) {}

  static create(level: LogLevelType): LogLevel {
    return new LogLevel(level);
  }

  isAtLeast(other: LogLevel): boolean {
    return LogLevel.order[this.value] >= LogLevel.order[other.value];
  }
}
