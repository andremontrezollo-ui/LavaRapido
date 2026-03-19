/**
 * Dependency Container — Composition Root for the Express backend.
 *
 * This is the single place where all modules and their dependencies are wired.
 * No business logic lives here — only construction and wiring.
 *
 * Architecture Rule: Only this file may instantiate concrete infrastructure
 * classes. Domain use cases receive their dependencies via constructor injection.
 */

import { ResilientEventBus } from '../shared/events/InMemoryEventBus';
import { SecureLogger } from '../shared/logging/logger';
import { DefaultRedactionPolicy } from '../shared/logging/redaction-policy';
import { GenerateAddressUseCase } from '../modules/address-generator/application/use-cases/generate-address.usecase';
import { IssueAddressTokenUseCase } from '../modules/address-generator/application/use-cases/issue-address-token.usecase';
import { InMemoryAddressRepository } from '../modules/address-generator/infra/repositories/address.repository';
import { InMemoryTokenRepository } from '../modules/address-generator/infra/repositories/token.repository';
import { CryptoRandomGenerator } from '../modules/address-generator/infra/adapters/random-generator.adapter';
import type { EventPublisher } from '../shared/ports/EventPublisher';
import type { Logger } from '../shared/logging';

export interface ReadinessStatus {
  isReady: boolean;
  checks: Record<string, { status: string; details?: string }>;
}

export class DependencyContainer {
  private readonly _eventBus: ResilientEventBus;
  private readonly _logger: Logger;
  private readonly _addressRepo: InMemoryAddressRepository;
  private readonly _tokenRepo: InMemoryTokenRepository;
  private readonly _randomGenerator: CryptoRandomGenerator;
  private readonly _eventPublisher: EventPublisher;

  readonly generateAddressUseCase: GenerateAddressUseCase;
  readonly issueAddressTokenUseCase: IssueAddressTokenUseCase;

  constructor() {
    this._logger = new SecureLogger(new DefaultRedactionPolicy());
    this._eventBus = new ResilientEventBus(null, {
      maxRetries: 3,
      retryDelayMs: 100,
    });

    this._eventPublisher = {
      publish: (event) => this._eventBus.publish(event),
    };

    this._addressRepo = new InMemoryAddressRepository();
    this._tokenRepo = new InMemoryTokenRepository();
    this._randomGenerator = new CryptoRandomGenerator();

    this.generateAddressUseCase = new GenerateAddressUseCase(
      this._addressRepo,
      this._randomGenerator,
      this._eventPublisher,
    );

    this.issueAddressTokenUseCase = new IssueAddressTokenUseCase(
      this._addressRepo,
      this._tokenRepo,
      this._randomGenerator,
      this._eventPublisher,
    );
  }

  get addressRepo(): InMemoryAddressRepository {
    return this._addressRepo;
  }

  get logger(): Logger {
    return this._logger;
  }

  async readinessCheck(): Promise<ReadinessStatus> {
    const dlqCount = this._eventBus.getDeadLetterQueue().length;
    return {
      isReady: dlqCount < 10,
      checks: {
        eventBus: {
          status: dlqCount < 10 ? 'ok' : 'degraded',
          details: `dlq_count=${dlqCount}`,
        },
      },
    };
  }
}
