import type { RedactionEngine } from '../../application/ports/redaction-engine.port';

export class RegexRedactionAdapter implements RedactionEngine {
  private readonly patterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    /\b(bc1|tb1)[a-zA-HJ-NP-Z0-9]{25,62}\b/g,
  ];

  redact(value: string): string {
    let result = value;
    for (const pattern of this.patterns) {
      result = result.replace(pattern, '[REDACTED]');
    }
    return result;
  }

  redactFields(fields: Record<string, unknown>, sensitiveKeys: string[]): Record<string, unknown> {
    const result = { ...fields };
    for (const key of sensitiveKeys) {
      if (result[key] !== undefined) result[key] = '[REDACTED]';
    }
    return result;
  }
}
