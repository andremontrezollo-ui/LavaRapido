/**
 * Structured Logger for Edge Functions — HTTP entry layer
 *
 * Wraps the CORE backend logger
 * (backend/src/infra/observability/StructuredLogger.ts) with the
 * function-based API expected by the edge functions.  The backend file
 * has no internal imports so it is importable from Deno.
 */

// Re-export types and utilities from the backend CORE.
export type { LogContext } from "../../../backend/src/infra/observability/StructuredLogger.ts";
export { generateRequestId } from "../../../backend/src/infra/observability/StructuredLogger.ts";

import {
  ConsoleStructuredLogger,
} from "../../../backend/src/infra/observability/StructuredLogger.ts";
import type { LogContext } from "../../../backend/src/infra/observability/StructuredLogger.ts";

const _logger = new ConsoleStructuredLogger();

/** Log at INFO level. */
export function logInfo(message: string, ctx: LogContext): void {
  _logger.info(message, ctx);
}

/** Log at WARN level. */
export function logWarn(message: string, ctx: LogContext): void {
  _logger.warn(message, ctx);
}

/** Log at ERROR level. */
export function logError(message: string, ctx: LogContext): void {
  _logger.error(message, ctx);
}
