/**
 * Base Domain Event
 * All domain events across modules must implement this interface.
 */

export interface DomainEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly aggregateId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Integration Event — crosses module boundaries via EventBus.
 * Carries a unique eventId for deduplication.
 */
export interface IntegrationEvent extends DomainEvent {
  readonly eventId: string;
  readonly source: string;
}

/**
 * All known event types in the system.
 */
export type SystemEvent =
  | { type: 'ADDRESS_TOKEN_EMITTED'; tokenId: string; namespace: string; expiresAt: Date; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'ADDRESS_TOKEN_RESOLVED'; tokenId: string; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'ADDRESS_TOKEN_EXPIRED'; tokenId: string; reason: 'ttl' | 'usage' | 'manual'; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'DEPOSIT_DETECTED'; txId: string; address: string; amount: number; blockHeight: number; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'DEPOSIT_CONFIRMED'; txId: string; confirmations: number; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'TRANSACTION_REORG_DETECTED'; txId: string; previousBlock: number; newBlock: number; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'LIQUIDITY_ALLOCATED'; allocationId: string; amount: number; poolId: string; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'OBLIGATION_RESERVED'; obligationId: string; amount: number; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'POOL_HEALTH_WARNING'; poolId: string; status: string; utilizationRate: number; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'POOL_REBALANCED'; poolId: string; previousBalance: number; newBalance: number; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'PAYMENT_SCHEDULED'; paymentId: string; scheduledFor: Date; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'PAYMENT_DUE'; paymentId: string; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'PAYMENT_EXECUTED'; paymentId: string; success: boolean; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'PAYMENT_CANCELLED'; paymentId: string; reason: string; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'LOG_REDACTED'; entryId: string; fieldsRedacted: string[]; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'LOG_PURGED'; entriesCount: number; reason: string; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'SESSION_CREATED'; sessionId: string; expiresAt: Date; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'SESSION_EXPIRED'; sessionId: string; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'SAGA_STEP_COMPLETED'; sagaId: string; step: string; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> }
  | { type: 'SAGA_COMPENSATION_TRIGGERED'; sagaId: string; failedStep: string; timestamp: Date; aggregateId?: string; correlationId?: string; causationId?: string; metadata?: Record<string, unknown> };

export type EventType = SystemEvent['type'];
