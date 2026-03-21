/**
 * Blockchain Event Normalizer Adapter
 */

import type { BlockchainEventDto } from '../../application/dtos/blockchain-event.dto';
import { UnsupportedSourceEventError } from '../../domain/errors/unsupported-source-event.error';

export class BlockchainEventNormalizer {
  normalize(rawEvent: Record<string, unknown>): BlockchainEventDto {
    const eventType = rawEvent['type'] as string;

    switch (eventType) {
      case 'tx':
        return {
          eventType: 'new_transaction',
          txId: rawEvent['txid'] as string,
          address: rawEvent['address'] as string,
          amount: rawEvent['amount'] as number,
          blockHeight: rawEvent['block_height'] as number,
          confirmations: (rawEvent['confirmations'] as number) ?? 0,
          rawData: rawEvent,
        };
      case 'block':
        return {
          eventType: 'new_block',
          blockHeight: rawEvent['height'] as number,
          rawData: rawEvent,
        };
      case 'confirmation':
        return {
          eventType: 'confirmation_update',
          txId: rawEvent['txid'] as string,
          confirmations: rawEvent['confirmations'] as number,
          rawData: rawEvent,
        };
      default:
        throw new UnsupportedSourceEventError(eventType);
    }
  }
}
