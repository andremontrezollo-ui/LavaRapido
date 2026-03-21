export interface LogEntryRecord { id: string; level: string; classification: string; message: string; fields: string; createdAt: string; expiresAt: string; isRedacted: boolean; }

export class LogEntryMapper {
  static toRecord(entry: { id: string; level: { value: string }; classification: { value: string }; message: string; fields: Record<string, unknown>; createdAt: Date; expiresAt: Date; isRedacted: boolean }): LogEntryRecord {
    return { id: entry.id, level: entry.level.value, classification: entry.classification.value, message: entry.message, fields: JSON.stringify(entry.fields), createdAt: entry.createdAt.toISOString(), expiresAt: entry.expiresAt.toISOString(), isRedacted: entry.isRedacted };
  }
}
