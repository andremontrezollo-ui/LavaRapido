/**
 * Structured Logger Adapter
 */

export class StructuredLoggerAdapter {
  log(level: string, message: string, fields: Record<string, unknown> = {}): void {
    const entry = { timestamp: new Date().toISOString(), level, message, ...fields };
    console.log(JSON.stringify(entry));
  }
}
