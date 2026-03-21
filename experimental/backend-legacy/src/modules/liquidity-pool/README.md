# Liquidity Pool Module

## Responsabilidade

Gerenciar reservas de liquidez, obrigações e alocações para operações de mixing.

## Eventos

- Consome: `DEPOSIT_CONFIRMED` (blockchain-monitor)
- Emite: `LIQUIDITY_ALLOCATED`, `OBLIGATION_RESERVED`, `POOL_HEALTH_WARNING`, `POOL_REBALANCED`
- Consumido por: `payment-scheduler` (LIQUIDITY_ALLOCATED)

## Estrutura

```
domain/      → Entidades, VOs, Policies, Events, Errors
application/ → Use Cases, DTOs, Ports
infra/       → Repositórios, Adapters, Mappers
```
