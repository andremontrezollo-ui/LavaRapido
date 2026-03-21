import { describe, it, expect } from 'vitest';
import { FieldRedactionPolicy } from '../domain/policies/field-redaction.policy';

describe('FieldRedactionPolicy', () => {
  const policy = new FieldRedactionPolicy();

  it('should redact sensitive field names', () => {
    expect(policy.evaluate({ fieldName: 'user_password', classification: 'public' }).shouldRedact).toBe(true);
    expect(policy.evaluate({ fieldName: 'email_address', classification: 'public' }).shouldRedact).toBe(true);
    expect(policy.evaluate({ fieldName: 'ip_source', classification: 'public' }).shouldRedact).toBe(true);
  });

  it('should not redact non-sensitive public fields', () => {
    expect(policy.evaluate({ fieldName: 'status', classification: 'public' }).shouldRedact).toBe(false);
  });

  it('should redact all fields for restricted classification', () => {
    expect(policy.evaluate({ fieldName: 'status', classification: 'restricted' }).shouldRedact).toBe(true);
  });
});
