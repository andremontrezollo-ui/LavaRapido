/**
 * Redaction Policy — masks sensitive data before logging.
 * Blocks secrets, tokens, full IPs, Bitcoin addresses, and PII.
 */

export interface RedactionPolicy {
  shouldRedactField(fieldName: string): boolean;
  redactValue(fieldName: string, value: unknown): unknown;
  redactString(input: string): string;
}

const SENSITIVE_FIELD_PATTERNS = [
  'password', 'secret', 'token', 'key', 'authorization', 'cookie',
  'private', 'credential', 'ssn', 'credit_card', 'card_number',
  'cvv', 'pin', 'passphrase', 'mnemonic', 'seed',
];

const ALLOWED_FIELDS = new Set([
  'level', 'message', 'timestamp', 'correlationId', 'requestId',
  'method', 'path', 'statusCode', 'duration', 'module',
  'action', 'step', 'status', 'count', 'reason', 'eventType',
]);

const REDACTION_PATTERNS: [RegExp, string][] = [
  [/\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g, '[BTC_ADDR]'],
  [/\bbc1[a-z0-9]{39,59}\b/g, '[BTC_BECH32]'],
  [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]'],
  [/[a-fA-F0-9]{64}/g, '[HASH_REDACTED]'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[JWT_REDACTED]'],
];

const MAX_VALUE_LENGTH = 200;

export class DefaultRedactionPolicy implements RedactionPolicy {
  shouldRedactField(fieldName: string): boolean {
    const lower = fieldName.toLowerCase();
    if (ALLOWED_FIELDS.has(fieldName)) return false;
    return SENSITIVE_FIELD_PATTERNS.some(p => lower.includes(p));
  }

  redactValue(fieldName: string, value: unknown): unknown {
    if (this.shouldRedactField(fieldName)) return '[REDACTED]';
    if (typeof value === 'string') {
      let redacted = this.redactString(value);
      if (redacted.length > MAX_VALUE_LENGTH) {
        redacted = redacted.substring(0, MAX_VALUE_LENGTH) + '...[TRUNCATED]';
      }
      return redacted;
    }
    return value;
  }

  redactString(input: string): string {
    let result = input;
    for (const [pattern, replacement] of REDACTION_PATTERNS) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }
}
