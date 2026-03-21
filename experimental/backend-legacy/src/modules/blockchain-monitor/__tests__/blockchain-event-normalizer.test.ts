import { describe, it, expect } from 'vitest';
import { BlockchainEventNormalizer } from '../infra/adapters/blockchain-event-normalizer.adapter';
import { UnsupportedSourceEventError } from '../domain/errors/unsupported-source-event.error';

describe('BlockchainEventNormalizer', () => {
  const normalizer = new BlockchainEventNormalizer();

  it('should normalize transaction events', () => {
    const result = normalizer.normalize({
      type: 'tx',
      txid: 'a'.repeat(64),
      address: 'bc1qtest',
      amount: 0.1,
      block_height: 800000,
      confirmations: 1,
    });

    expect(result.eventType).toBe('new_transaction');
    expect(result.txId).toBe('a'.repeat(64));
  });

  it('should throw on unsupported event type', () => {
    expect(() => normalizer.normalize({ type: 'unknown' })).toThrow(UnsupportedSourceEventError);
  });
});
