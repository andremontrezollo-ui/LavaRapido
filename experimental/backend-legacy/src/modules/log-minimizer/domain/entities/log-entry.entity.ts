/**
 * LogEntry Entity
 */

import { LogLevel, type LogLevelType } from '../value-objects/log-level.vo';
import { SensitivityClassification, type ClassificationType } from '../value-objects/sensitivity-classification.vo';

export class LogEntry {
  constructor(
    readonly id: string,
    readonly level: LogLevel,
    readonly classification: SensitivityClassification,
    readonly message: string,
    private _fields: Record<string, unknown>,
    readonly createdAt: Date,
    readonly expiresAt: Date,
    private _isRedacted: boolean = false,
  ) {}

  get fields(): Record<string, unknown> { return { ...this._fields }; }
  get isRedacted(): boolean { return this._isRedacted; }

  redactField(fieldName: string): void {
    if (this._fields[fieldName] !== undefined) {
      this._fields[fieldName] = '[REDACTED]';
    }
  }

  markRedacted(): void {
    this._isRedacted = true;
  }

  isExpired(now: Date): boolean {
    return now.getTime() > this.expiresAt.getTime();
  }

  requiresRedaction(): boolean {
    return this.classification.requiresRedaction();
  }
}
