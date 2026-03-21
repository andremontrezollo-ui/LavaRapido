import type { LogRepository } from '../../application/ports/log-repository.port';
import type { LogEntry } from '../../domain/entities/log-entry.entity';

export class InMemoryLogRepository implements LogRepository {
  private store = new Map<string, LogEntry>();

  async findById(id: string): Promise<LogEntry | null> { return this.store.get(id) ?? null; }
  async findAll(): Promise<LogEntry[]> { return Array.from(this.store.values()); }
  async findExpired(now: Date): Promise<LogEntry[]> { return Array.from(this.store.values()).filter(e => e.isExpired(now)); }
  async save(entry: LogEntry): Promise<void> { this.store.set(entry.id, entry); }
  async delete(id: string): Promise<void> { this.store.delete(id); }
  async deleteMany(ids: string[]): Promise<void> { ids.forEach(id => this.store.delete(id)); }
}
