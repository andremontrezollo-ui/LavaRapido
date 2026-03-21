/**
 * SensitivityClassification Value Object
 */

export type ClassificationType = 'public' | 'internal' | 'confidential' | 'restricted';

export class SensitivityClassification {
  private constructor(readonly value: ClassificationType) {}

  static create(classification: ClassificationType): SensitivityClassification {
    return new SensitivityClassification(classification);
  }

  requiresRedaction(): boolean {
    return this.value === 'confidential' || this.value === 'restricted';
  }
}
