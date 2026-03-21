# Payment Scheduler Module

## Responsabilidade

Agendar, gerenciar e executar pagamentos com atraso configurável e jitter para privacidade.

## Eventos

- Consome: `LIQUIDITY_ALLOCATED` (liquidity-pool)
- Emite: `PAYMENT_SCHEDULED`, `PAYMENT_DUE`, `PAYMENT_EXECUTED`, `PAYMENT_CANCELLED`
- Consumido por: `log-minimizer` (PAYMENT_EXECUTED)

## Estrutura

```
domain/      → Entidades, VOs, Policies, Events, Errors
application/ → Use Cases, DTOs, Ports
infra/       → Repositórios, Adapters, Mappers
```
