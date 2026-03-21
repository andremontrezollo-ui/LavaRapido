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
