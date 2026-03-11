# Blockchain Monitor Module

## Responsabilidade

Observar eventos da blockchain, rastrear depósitos e confirmar transações
com base em políticas de threshold configuráveis.

## Eventos Emitidos

- `DEPOSIT_DETECTED` — Novo depósito detectado na blockchain
- `DEPOSIT_CONFIRMED` — Depósito atingiu o threshold de confirmações
- `TRANSACTION_REORG_DETECTED` — Reorganização detectada afetando uma transação

## Integração Inter-módulo

- **liquidity-pool** consome `DEPOSIT_CONFIRMED` para registrar créditos

## Estrutura

```
domain/     → Entidades, VOs, Policies, Events, Errors
application/ → Use Cases, DTOs, Ports
infra/       → Repositórios, Adapters, Mappers
```

## Nomenclatura Canônica

### Ports (application/ports/)
| Interface | Arquivo |
|---|---|
| `BlockchainSource` | `blockchain-source.port.ts` |
| `BlockchainEventPublisher` | `event-publisher.port.ts` |
| `ObservedTransactionRepository` | `observed-transaction-repository.port.ts` |
| `BlockchainClock` | `clock.port.ts` |

### Use Cases (application/use-cases/)
| Classe | Responsabilidade |
|---|---|
| `IngestBlockchainEventUseCase` | Ingere um evento da blockchain e cria a transação observada |
| `ConfirmDepositUseCase` | Confirma um depósito quando o threshold de confirmações é atingido |
| `ReconcileObservedTransactionsUseCase` | Reconcilia transações pendentes consultando a fonte blockchain |
| `GetTransactionStatusUseCase` | Retorna o status atual de uma transação observada |

### DTOs (application/dtos/)
| Tipo | Uso |
|---|---|
| `BlockchainEventDto` | Evento normalizado recebido da fonte blockchain |
| `DepositConfirmationDto` | Resultado da confirmação de um depósito |
| `TransactionStatusDto` | Status atual de uma transação observada |

### Entidades e Value Objects (domain/)
| Nome | Tipo | Arquivo |
|---|---|---|
| `ObservedTransaction` | Entity | `entities/observed-transaction.entity.ts` |
| `BlockObservation` | Entity | `entities/block-observation.entity.ts` |
| `ConfirmationState` | Entity | `entities/confirmation-state.entity.ts` |
| `TxId` | Value Object | `value-objects/txid.vo.ts` |
| `BlockHeight` | Value Object | `value-objects/block-height.vo.ts` |
| `ConfirmationCount` | Value Object | `value-objects/confirmation-count.vo.ts` |
| `MonitoredAddress` | Value Object | `value-objects/monitored-address.vo.ts` |

### Eventos de Domínio (domain/events/)
| Interface | Factory | Tipo do evento |
|---|---|---|
| `DepositDetectedEvent` | `createDepositDetectedEvent` | `'DEPOSIT_DETECTED'` |
| `DepositConfirmedEvent` | `createDepositConfirmedEvent` | `'DEPOSIT_CONFIRMED'` |
| `TransactionReorgDetectedEvent` | `createTransactionReorgDetectedEvent` | `'TRANSACTION_REORG_DETECTED'` |

### Erros de Domínio (domain/errors/)
| Classe | Condição |
|---|---|
| `InvalidTxIdError` | Hash de transação inválido |
| `InconsistentConfirmationStateError` | Estado de confirmação inconsistente |
| `UnsupportedSourceEventError` | Tipo de evento da fonte não suportado |

### Adapters e Repositórios (infra/)
| Classe | Porta implementada | Arquivo |
|---|---|---|
| `MockBlockchainSource` | `BlockchainSource` | `adapters/mock-blockchain-source.adapter.ts` |
| `BlockchainEventNormalizer` | — | `adapters/blockchain-event-normalizer.adapter.ts` |
| `InMemoryObservedTransactionRepository` | `ObservedTransactionRepository` | `repositories/observed-transaction.repository.ts` |
| `ObservedTransactionMapper` | — | `mappers/observed-transaction.mapper.ts` |

