/**
 * Secure Structured Logger
 * All output is redacted through configurable policies before emission.
 */

import type { RedactionPolicy } from './redaction-policy';
import { DefaultRedactionPolicy } from './redaction-policy';
import { buildSafeContext } from './safe-context';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  context?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(baseContext: Record<string, unknown>): Logger;
}

export class SecureLogger implements Logger {
  private readonly baseContext: Record<string, unknown>;

  constructor(
    private readonly redactionPolicy: RedactionPolicy = new DefaultRedactionPolicy(),
    private readonly correlationId?: string,
    baseContext: Record<string, unknown> = {},
  ) {
    this.baseContext = baseContext;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.emit('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.emit('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.emit('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.emit('error', message, context);
  }

  child(baseContext: Record<string, unknown>): Logger {
    return new SecureLogger(
      this.redactionPolicy,
      this.correlationId,
      { ...this.baseContext, ...baseContext },
    );
  }

  private emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const merged = { ...this.baseContext, ...context };
    const safe = buildSafeContext(merged, this.redactionPolicy);
    const entry: LogEntry = {
      level,
      message: this.redactionPolicy.redactString(message),
      timestamp: new Date().toISOString(),
      ...(this.correlationId ? { correlationId: this.correlationId } : {}),
      ...(Object.keys(safe).length > 0 ? { context: safe } : {}),
    };

    const line = JSON.stringify(entry);
    switch (level) {
      case 'debug': console.debug(line); break;
      case 'info': console.info(line); break;
      case 'warn': console.warn(line); break;
      case 'error': console.error(line); break;
    }
  }
}
