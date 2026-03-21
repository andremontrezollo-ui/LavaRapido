/**
 * Structured Logger for Edge Functions
 * 
 * Privacy-preserving: redacts BTC addresses, IPs, emails.
 */

const REDACTION_PATTERNS = [
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

export function logInfo(message: string, ctx: LogContext): void {
  console.log(formatLog("info", message, ctx));
}

export function logWarn(message: string, ctx: LogContext): void {
  console.warn(formatLog("warn", message, ctx));
}

export function logError(message: string, ctx: LogContext): void {
  console.error(formatLog("error", message, ctx));
}

export function generateRequestId(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
