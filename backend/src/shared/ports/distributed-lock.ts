/**
 * Distributed Lock Port — prevents concurrent execution.
 */

export interface DistributedLock {
  acquire(key: string, ttlSeconds: number): Promise<boolean>;
  release(key: string): Promise<void>;
  renew(key: string, ttlSeconds: number): Promise<boolean>;
  isHeld(key: string): Promise<boolean>;
}
