/**
 * Blockchain Monitor - Infrastructure Layer
 *
 * Repositories, adapters, and mappers implementing application ports.
 */

// Repositories
export { InMemoryObservedTransactionRepository } from './repositories/observed-transaction.repository';

// Adapters
export { BlockchainEventNormalizer } from './adapters/blockchain-event-normalizer.adapter';
export { MockBlockchainSource } from './adapters/mock-blockchain-source.adapter';

// Mappers
export { ObservedTransactionMapper } from './mappers/observed-transaction.mapper';
export type { ObservedTransactionRecord } from './mappers/observed-transaction.mapper';

