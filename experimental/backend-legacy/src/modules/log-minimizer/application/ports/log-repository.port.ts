import type { LogEntry } from '../../domain/entities/log-entry.entity';

export interface LogRepository {
  findById(id: string): Promise<LogEntry | null>;
  findAll(): Promise<LogEntry[]>;
  findExpired(now: Date): Promise<LogEntry[]>;
  save(entry: LogEntry): Promise<void>;
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
}
