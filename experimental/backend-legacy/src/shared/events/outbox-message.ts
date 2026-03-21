/**
 * Outbox Message — persisted alongside aggregate changes in the same transaction.
 * A background processor reads pending messages and publishes them.
 */

export type OutboxStatus = 'pending' | 'published' | 'failed' | 'dead_letter';

export interface OutboxMessage {
  readonly id: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly payload: string; // JSON serialized event
  readonly correlationId: string;
  readonly createdAt: Date;
  status: OutboxStatus;
  retryCount: number;
  lastAttemptAt: Date | null;
  publishedAt: Date | null;
  error: string | null;
}

export interface OutboxStore {
  save(message: OutboxMessage): Promise<void>;
  findPending(limit: number): Promise<OutboxMessage[]>;
  markPublished(id: string, now: Date): Promise<void>;
  markFailed(id: string, error: string, now: Date): Promise<void>;
  markDeadLetter(id: string, now: Date): Promise<void>;
  countByStatus(status: OutboxStatus): Promise<number>;
}

export function createOutboxMessage(
  id: string,
  eventType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
  correlationId: string,
  now: Date,
): OutboxMessage {
  return {
    id,
    eventType,
    aggregateId,
    payload: JSON.stringify(payload),
    correlationId,
    createdAt: now,
    status: 'pending',
    retryCount: 0,
    lastAttemptAt: null,
    publishedAt: null,
    error: null,
  };
}
