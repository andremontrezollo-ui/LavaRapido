# Log Minimizer Module

## Responsabilidade

Classificar dados de log, aplicar redação de campos sensíveis, impor políticas de retenção e purgar logs expirados.

## Eventos

- Consome: `PAYMENT_EXECUTED` (payment-scheduler) para registro/auditoria
- Emite: `LOG_REDACTED`, `LOG_PURGED`

## Estrutura

```
domain/      → Entidades, VOs, Policies, Events, Errors
application/ → Use Cases, DTOs, Ports
infra/       → Repositórios, Adapters, Mappers
```
