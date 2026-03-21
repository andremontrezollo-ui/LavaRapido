/**
 * Blockchain Monitor - Domain Layer
 */

// Entities
export { ObservedTransaction } from './entities/observed-transaction.entity';
export type { TransactionStatus } from './entities/observed-transaction.entity';
export { BlockObservation } from './entities/block-observation.entity';
export { ConfirmationState } from './entities/confirmation-state.entity';

// Value Objects
export { TxId } from './value-objects/txid.vo';
export { BlockHeight } from './value-objects/block-height.vo';
export { ConfirmationCount } from './value-objects/confirmation-count.vo';
export { MonitoredAddress } from './value-objects/monitored-address.vo';

// Policies
export { ConfirmationThresholdPolicy } from './policies/confirmation-threshold.policy';
export { ReorgTolerancePolicy } from './policies/reorg-tolerance.policy';

// Events
export type { DepositDetectedEvent } from './events/deposit-detected.event';
export { createDepositDetectedEvent } from './events/deposit-detected.event';
export type { DepositConfirmedEvent } from './events/deposit-confirmed.event';
export { createDepositConfirmedEvent } from './events/deposit-confirmed.event';
export type { TransactionReorgDetectedEvent } from './events/transaction-reorg-detected.event';
export { createTransactionReorgDetectedEvent } from './events/transaction-reorg-detected.event';

// Errors
export { InvalidTxIdError } from './errors/invalid-txid.error';
export { InconsistentConfirmationStateError } from './errors/inconsistent-confirmation-state.error';
export { UnsupportedSourceEventError } from './errors/unsupported-source-event.error';
