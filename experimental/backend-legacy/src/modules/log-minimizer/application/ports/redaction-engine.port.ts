export interface RedactionEngine {
  redact(value: string): string;
  redactFields(fields: Record<string, unknown>, sensitiveKeys: string[]): Record<string, unknown>;
}
