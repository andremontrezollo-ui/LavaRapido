export type { Clock } from './Clock';
export { SystemClock, TestClock } from './Clock';
export type { IdGenerator } from './IdGenerator';
export { CryptoIdGenerator } from './IdGenerator';
export type { Repository, TransactionalRepository, UnitOfWork } from './Repository';
export type { DistributedLock } from './DistributedLock';

/** Generic event publisher port used by application use cases. */
export interface EventPublisher {
  publish(event: unknown): Promise<void>;
}
