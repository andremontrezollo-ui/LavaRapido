/**
 * Log Minimizer - Infrastructure Layer
 * 
 * Adapters for log stores and telemetry.
 */

import type { LogStore, ArchiveStore, IdGenerator, Clock, EventPublisher } from '../application';
import type { LogEntry, DataClass, LogEvent } from '../domain';

// In-Memory Log Store
export class InMemoryLogStore implements LogStore {
  private entries = new Map<string, LogEntry>();

  async save(entry: LogEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async findExpired(): Promise<LogEntry[]> {
    const now = new Date();
    return Array.from(this.entries.values()).filter(
      entry => entry.expiresAt < now
    );
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
  }

  async findByPeriod(start: Date, end: Date): Promise<LogEntry[]> {
    return Array.from(this.entries.values()).filter(
      entry => entry.timestamp >= start && entry.timestamp <= end
    );
  }

  async countByClass(dataClass: DataClass): Promise<number> {
    return Array.from(this.entries.values()).filter(
      entry => entry.dataClass === dataClass
    ).length;
  }

  // Test helpers
  getAll(): LogEntry[] {
    return Array.from(this.entries.values());
  }

  clear(): void {
    this.entries.clear();
  }
}

// In-Memory Archive Store
export class InMemoryArchiveStore implements ArchiveStore {
  private archived: LogEntry[] = [];

  async archive(entry: LogEntry): Promise<void> {
    this.archived.push(entry);
  }

  getArchived(): readonly LogEntry[] {
    return [...this.archived];
  }

  clear(): void {
    this.archived = [];
  }
}

// System Clock
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

// Test Clock
export class TestClock implements Clock {
  private currentTime: Date;

  constructor(initialTime: Date = new Date()) {
    this.currentTime = initialTime;
  }

  now(): Date {
    return new Date(this.currentTime);
  }

  advance(seconds: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + seconds * 1000);
  }
}

// Secure ID Generator
export class CryptoIdGenerator implements IdGenerator {
  generate(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
}

// In-Memory Event Publisher
export class InMemoryLogEventPublisher implements EventPublisher {
  private events: LogEvent[] = [];

  async publish(event: LogEvent): Promise<void> {
    this.events.push(event);
  }

  getEvents(): readonly LogEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
