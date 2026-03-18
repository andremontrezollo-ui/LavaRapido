/**
 * Telemetry / Structured Logger for Edge Functions
 *
 * Privacy-preserving: redacts BTC addresses, IPs, emails before logging.
 * Mirrors the StructuredLogger in backend/src/infra/observability/StructuredLogger.ts.
 */

const REDACTION_PATTERNS: RegExp[] = [
  /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
  /\bbc1[a-z0-9]{39,59}\b/g,
  /\btb1[a-z0-9]{39,59}\b/g,
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
];

function redact(text: string): string {
  let r = text;
  for (const p of REDACTION_PATTERNS) r = r.replace(p, "[REDACTED]");
  return r;
}

export interface LogContext {
  requestId: string;
  endpoint: string;
  status?: number;
  latencyMs?: number;
  rateLimitTriggered?: boolean;
  [key: string]: unknown;
}

function formatLog(level: string, message: string, ctx: LogContext): string {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    safe[k] = typeof v === "string" ? redact(v) : v;
  }
  return JSON.stringify({ level, message: redact(message), ...safe, timestamp: new Date().toISOString() });
}

export const telemetry = {
  info: (message: string, ctx: LogContext): void => console.log(formatLog("info", message, ctx)),
  warn: (message: string, ctx: LogContext): void => console.warn(formatLog("warn", message, ctx)),
  error: (message: string, ctx: LogContext): void => console.error(formatLog("error", message, ctx)),
} as const;
