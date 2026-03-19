/**
 * Structured Logger
 * 
 * Privacy-preserving structured logging with redaction.
 * All logs include requestId, endpoint, status, latency.
 */

const REDACTION_PATTERNS = [
  /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
  /\bbc1[a-z0-9]{39,59}\b/g,
  /\btb1[a-z0-9]{39,59}\b/g,
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
];

function redact(text: string): string {
  let result = text;
  for (const pattern of REDACTION_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

export interface LogContext {
  requestId: string;
  endpoint: string;
  status?: number;
  latencyMs?: number;
  rateLimitTriggered?: boolean;
  [key: string]: unknown;
}

export interface StructuredLogger {
  info(message: string, context: LogContext): void;
  warn(message: string, context: LogContext): void;
  error(message: string, context: LogContext): void;
}

export class ConsoleStructuredLogger implements StructuredLogger {
  private format(level: string, message: string, context: LogContext): string {
    const safeCtx: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(context)) {
      safeCtx[k] = typeof v === 'string' ? redact(v) : v;
    }
    return JSON.stringify({
      level,
      message: redact(message),
      ...safeCtx,
      timestamp: new Date().toISOString(),
    });
  }

  info(message: string, context: LogContext): void {
    console.log(this.format('info', message, context));
  }

  warn(message: string, context: LogContext): void {
    console.warn(this.format('warn', message, context));
  }

  error(message: string, context: LogContext): void {
    console.error(this.format('error', message, context));
  }
}

/** Generate a unique request ID */
export function generateRequestId(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}
