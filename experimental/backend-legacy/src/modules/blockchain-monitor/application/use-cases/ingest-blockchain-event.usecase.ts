/**
 * IngestBlockchainEvent Use Case
 */

import type { BlockchainEventDto } from '../dtos/blockchain-event.dto';
import type { BlockchainSource } from '../ports/blockchain-source.port';
import type { ObservedTransactionRepository } from '../ports/observed-transaction-repository.port';
import type { BlockchainEventPublisher } from '../ports/event-publisher.port';
import type { BlockchainClock } from '../ports/clock.port';
import { ObservedTransaction } from '../../domain/entities/observed-transaction.entity';
import { TxId } from '../../domain/value-objects/txid.vo';
import { ConfirmationCount } from '../../domain/value-objects/confirmation-count.vo';
import { BlockHeight } from '../../domain/value-objects/block-height.vo';
import { createDepositDetectedEvent } from '../../domain/events/deposit-detected.event';

export class IngestBlockchainEventUseCase {
  constructor(
    private readonly repo: ObservedTransactionRepository,
    private readonly publisher: BlockchainEventPublisher,
    private readonly clock: BlockchainClock,
  ) {}

  async execute(dto: BlockchainEventDto): Promise<void> {
    if (dto.eventType !== 'new_transaction' || !dto.txId || !dto.address || dto.amount === undefined) {
      return;
    }

    const existing = await this.repo.findByTxId(dto.txId);
    if (existing) return;

    const now = this.clock.now();
    const id = dto.txId;
    const tx = new ObservedTransaction(
      id,
      TxId.create(dto.txId),
      dto.address,
      dto.amount,
      ConfirmationCount.create(dto.confirmations ?? 0),
      BlockHeight.create(dto.blockHeight ?? 0),
      'pending',
      now,
      now,
    );

    await this.repo.save(tx);
    await this.publisher.publish(createDepositDetectedEvent(dto.txId, dto.address, dto.amount, dto.blockHeight ?? 0));
  }
}
