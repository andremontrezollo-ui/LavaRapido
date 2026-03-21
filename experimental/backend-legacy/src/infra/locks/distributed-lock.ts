/**
 * In-Memory Distributed Lock.
 */

import type { DistributedLock } from '../../shared/ports/DistributedLock';

interface LockEntry {
  key: string;
  expiresAt: Date;
}

export class InMemoryDistributedLock implements DistributedLock {
  private locks = new Map<string, LockEntry>();

  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    this.cleanup();
    if (this.locks.has(key)) return false;
    this.locks.set(key, { key, expiresAt: new Date(Date.now() + ttlSeconds * 1000) });
    return true;
  }

  async release(key: string): Promise<void> {
    this.locks.delete(key);
  }

  async renew(key: string, ttlSeconds: number): Promise<boolean> {
    const entry = this.locks.get(key);
    if (!entry) return false;
    entry.expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    return true;
  }

  async isHeld(key: string): Promise<boolean> {
    this.cleanup();
    return this.locks.has(key);
  }

  private cleanup(): void {
    const now = new Date();
    for (const [key, entry] of this.locks) {
      if (entry.expiresAt < now) this.locks.delete(key);
    }
  }

  clear(): void { this.locks.clear(); }
}
