# ShadowMix — Backend (Referência Conceitual)

> ⚠️ **Este diretório NÃO representa o backend em execução do sistema. Ele é uma arquitetura de referência, alvo futuro ou laboratório conceitual.**
>
> O runtime HTTP real está exclusivamente em `supabase/functions/` (Deno Edge Functions).
> Este diretório não é compilado, implantado, nem chamado pelo frontend em nenhuma circunstância.
> Veja o [README principal](../README.md) para a arquitetura oficial em execução.

---

Módulos de domínio com foco em privacidade seguindo princípios de Clean Architecture.

## Module Structure

Each module follows a three-layer architecture:

```
module/
├── domain/       # Business entities, value objects, domain events
├── application/  # Use cases, orchestration, no I/O
└── infra/        # Adapters, repositories, external integrations
```

## Modules

| Module | Responsibility |
|--------|----------------|
| `blockchain-monitor` | Observes blockchain events (confirmations, fees) |
| `address-generator` | Creates unique, non-reusable identifiers per operation |
| `payment-scheduler` | Manages asynchronous execution with variable time windows |
| `liquidity-pool` | Structural dissociation layer for fund aggregation |
| `log-minimizer` | Automatic removal of sensitive metadata |

## Cross-Cutting Concerns (Referência Conceitual)

> As entradas abaixo descrevem intenções arquiteturais de referência, não implementações ativas.
> O único ponto de entrada HTTP do sistema real é `supabase/functions/`.

- **api/**: Contratos e abstrações de interface HTTP (conceitual — não usado pelo frontend)
- **shared/**: Kernel mínimo compartilhado (IDs, clocks, eventos)
- **infra/**: Barramento de eventos, observabilidade, abstrações de storage

## Design Principles

1. **Low Coupling**: Modules communicate via events and stable contracts
2. **Privacy by Architecture**: Minimal data collection, segregated contexts
3. **Security by Design**: Defense in depth, no secrets in application code
4. **Auditability**: Privacy-preserving logs without user reidentification
