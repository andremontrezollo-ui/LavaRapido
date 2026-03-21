/**
 * Field Redaction Policy
 */

import type { Policy } from '../../../../shared/policies/Policy';

interface RedactionInput {
  fieldName: string;
  classification: string;
}

interface RedactionResult {
  shouldRedact: boolean;
  pattern?: string;
}

export class FieldRedactionPolicy implements Policy<RedactionInput, RedactionResult> {
  private readonly sensitivePatterns = [
    'password', 'secret', 'token', 'key', 'address', 'ip',
    'email', 'phone', 'ssn', 'credit_card', 'private_key',
  ];

  evaluate(input: RedactionInput): RedactionResult {
    const fieldLower = input.fieldName.toLowerCase();
    const matched = this.sensitivePatterns.find(p => fieldLower.includes(p));

    if (matched) return { shouldRedact: true, pattern: matched };
    if (input.classification === 'restricted' || input.classification === 'confidential') {
      return { shouldRedact: true };
    }
    return { shouldRedact: false };
  }
}
