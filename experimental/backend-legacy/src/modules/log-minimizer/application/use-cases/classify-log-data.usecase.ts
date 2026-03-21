import type { LogEntryDto } from '../dtos/log-entry.dto';
import { SensitivityClassification, type ClassificationType } from '../../domain/value-objects/sensitivity-classification.vo';

export class ClassifyLogDataUseCase {
  private readonly patterns: Array<{ pattern: RegExp; classification: ClassificationType }> = [
    { pattern: /password|secret|private_key/i, classification: 'restricted' },
    { pattern: /email|phone|address|ip/i, classification: 'confidential' },
    { pattern: /user_id|session/i, classification: 'internal' },
  ];

  execute(dto: LogEntryDto): ClassificationType {
    const allText = JSON.stringify(dto.fields) + dto.message;
    for (const { pattern, classification } of this.patterns) {
      if (pattern.test(allText)) return classification;
    }
    return 'public';
  }
}
