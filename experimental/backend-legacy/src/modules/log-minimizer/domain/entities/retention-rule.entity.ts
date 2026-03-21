/**
 * RetentionRule Entity
 */

import { RetentionWindow } from '../value-objects/retention-window.vo';
import type { ClassificationType } from '../value-objects/sensitivity-classification.vo';

export class RetentionRule {
  constructor(
    readonly id: string,
    readonly classification: ClassificationType,
    readonly retentionWindow: RetentionWindow,
    readonly autoRedact: boolean,
  ) {}
}
