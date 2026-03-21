/**
 * RedactLogEntry Use Case
 * Conceptually reacts to PAYMENT_EXECUTED from payment-scheduler.
 */

import type { LogRepository } from '../ports/log-repository.port';
import type { RedactedLogEntryDto } from '../dtos/redacted-log-entry.dto';
import { FieldRedactionPolicy } from '../../domain/policies/field-redaction.policy';

export class RedactLogEntryUseCase {
  private readonly policy = new FieldRedactionPolicy();

  constructor(private readonly repo: LogRepository) {}

  async execute(entryId: string): Promise<RedactedLogEntryDto | null> {
    const entry = await this.repo.findById(entryId);
    if (!entry) return null;

    const redacted: string[] = [];
    for (const fieldName of Object.keys(entry.fields)) {
      const result = this.policy.evaluate({ fieldName, classification: entry.classification.value });
      if (result.shouldRedact) {
        entry.redactField(fieldName);
        redacted.push(fieldName);
      }
    }

    if (redacted.length > 0) {
      entry.markRedacted();
      await this.repo.save(entry);
    }

    return { id: entryId, fieldsRedacted: redacted, redactedAt: new Date().toISOString() };
  }
}
