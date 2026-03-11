/**
 * Blockchain Monitor - Infrastructure Layer
 * 
 * Adapters for data sources and simulators.
 * Implements ports defined in application layer.
 */

// Adapters
export { BlockchainEventNormalizer } from './adapters/blockchain-event-normalizer.adapter';
export { MockBlockchainSource } from './adapters/mock-blockchain-source.adapter';

// Repositories
export { InMemoryObservedTransactionRepository } from './repositories/observed-transaction.repository';

// Mappers
export { ObservedTransactionMapper } from './mappers/observed-transaction.mapper';
export type { ObservedTransactionRecord } from './mappers/observed-transaction.mapper';
