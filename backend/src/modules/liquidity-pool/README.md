# Liquidity Pool Module

## Responsabilidade

Gerenciar reservas de liquidez, obrigações e alocações para operações de mixing.

## Arquitetura

O módulo segue DDD com separação em três camadas:

```
domain/      → Entidades, Value Objects, Policies, Events, Errors
application/ → Use Cases, DTOs, Ports
infra/       → Repositórios, Adapters, Mappers
```

## Conceitos de Domínio

### Agregado Principal
- **LiquidityPool** — pool de liquidez com `totalBalance`, `reservedAmount`, `availableAmount` e `status`

### Entidades
- **Obligation** — reserva de liquidez pendente vinculada a um pool
- **Allocation** — alocação confirmada de liquidez para um destino
- **ReserveBalance** — saldo de reserva associado a um pool

### Value Objects
- **Amount** — valor monetário em BTC ou SAT
- **ObligationId** — identificador tipado de obrigação
- **ReserveId** — identificador tipado de reserva

### Policies
- **PoolHealthPolicy** — avalia saúde do pool com base em `utilizationRate` e `pendingObligations`
- **AllocationPolicy** — valida se uma alocação pode ser executada
- **ReserveThresholdPolicy** — determina ação com base na taxa de disponibilidade

### Errors
- **InsufficientLiquidityError** — tentativa de reserva além do disponível
- **InvalidAllocationError** — alocação inválida
- **InconsistentReserveStateError** — estado interno inconsistente do pool

## Eventos

- **Consome:** `DEPOSIT_CONFIRMED` (blockchain-monitor)
- **Emite:**
  - `LIQUIDITY_ALLOCATED` — liquidez alocada para um destino
  - `OBLIGATION_RESERVED` — obrigação criada e liquidez reservada
  - `POOL_HEALTH_WARNING` — pool em estado de atenção ou crítico
  - `POOL_REBALANCED` — pool rebalanceado
- **Consumido por:** `payment-scheduler` (LIQUIDITY_ALLOCATED)

## Use Cases

| Use Case | Descrição |
|---|---|
| `AllocateLiquidityUseCase` | Aloca liquidez do pool para um destino (com idempotência) |
| `ReserveObligationUseCase` | Cria obrigação e reserva liquidez correspondente |
| `ReleaseObligationUseCase` | Libera obrigação (fulfilled / expired / cancelled) |
| `RegisterDepositCreditUseCase` | Credita depósito confirmado no pool |
| `RebalancePoolUseCase` | Rebalanceia o pool e emite evento |
| `GetPoolHealthUseCase` | Consulta saúde atual do pool |

## Ports

| Port | Descrição |
|---|---|
| `LiquidityPoolRepository` | Persiste e recupera o agregado `LiquidityPool` |
| `ObligationRepository` | Persiste e consulta obrigações por pool |
| `PoolEventPublisher` | Publica eventos de domínio |
| `PoolClock` | Abstração de relógio para injeção em testes |

## Dependências Externas

- `shared/events/DomainEvent` — contrato base de eventos
- `shared/policies/idempotency-policy` — guard de idempotência para use cases

## Failure Modes

- Pool não encontrado → erro explícito no use case
- Liquidez insuficiente → `AllocationPolicy` rejeita antes de modificar o pool
- Pool em estado `critical` → `AllocationPolicy` bloqueia alocações
- Operação duplicada → `IdempotencyGuard` retorna resultado anterior sem re-executar

