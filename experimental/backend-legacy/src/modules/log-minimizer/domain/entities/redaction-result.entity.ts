/**
 * RedactionResult Entity
 */

export class RedactionResult {
  constructor(
    readonly entryId: string,
    readonly fieldsRedacted: string[],
    readonly redactedAt: Date,
  ) {}
}
