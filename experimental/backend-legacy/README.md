# ShadowMix Backend Architecture

Privacy-focused backend modules following Clean Architecture principles.

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

## Cross-Cutting Concerns

- **api/**: REST endpoints for external communication
- **shared/**: Minimal shared kernel (IDs, clocks, events)
- **infra/**: Event bus, observability, storage abstractions

## Design Principles

1. **Low Coupling**: Modules communicate via events and stable contracts
2. **Privacy by Architecture**: Minimal data collection, segregated contexts
3. **Security by Design**: Defense in depth, no secrets in application code
4. **Auditability**: Privacy-preserving logs without user reidentification
