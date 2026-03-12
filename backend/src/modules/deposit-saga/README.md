# Deposit Processing Saga

Coordena o fluxo completo de depósito-para-pagamento entre módulos:

1. **blockchain-monitor** — Confirma que o depósito tem confirmações suficientes
2. **liquidity-pool** — Reserva liquidez do pool
3. **payment-scheduler** — Agenda pagamentos para os endereços de destino

## Fluxo de Eventos

```
DEPOSIT_CONFIRMED → reserve_liquidity → LIQUIDITY_ALLOCATED → schedule_payments → PAYMENT_SCHEDULED
```

## Passos (`DepositSagaStepName`)

| Step                | Ação                                                  | Compensação                              |
|---------------------|-------------------------------------------------------|------------------------------------------|
| `confirm_deposit`   | Chama `confirmDeposit(txId)`                          | Chama `markDepositUnprocessed(txId)`     |
| `reserve_liquidity` | Chama `reserveLiquidity(poolId, amount)` → `allocationId` | Chama `releaseLiquidity(poolId, allocationId)` |
| `schedule_payments` | Chama `schedulePayment(dest, amount, delay)` por destino | **No-op** (ver Limitação abaixo)     |

## Estratégia de Compensação

- Se `schedule_payments` falhar → `releaseLiquidity` é chamado (compensa `reserve_liquidity`)
- Se `reserve_liquidity` falhar → `markDepositUnprocessed` é chamado (compensa `confirm_deposit`)
- Todos os passos são idempotentes e podem ser re-tentados com segurança

## Jitter de Delay

O delay por pagamento é gerado via `SagaJitterProvider` injetável:

```typescript
export interface SagaJitterProvider {
  nextInt(min: number, max: number): number;
}
```

Por padrão usa `Math.random()`. Para testes determinísticos, injete um provider fixo:

```typescript
const fixedJitter: SagaJitterProvider = { nextInt: () => 120 };
createDepositSagaSteps(ctx, { ...deps, jitter: fixedJitter });
```

## Failure Modes

| Cenário                          | Comportamento                                           |
|----------------------------------|---------------------------------------------------------|
| `confirmDeposit` lança erro      | Saga compensa: `markDepositUnprocessed`, status = compensated |
| `reserveLiquidity` lança erro    | Saga compensa: `markDepositUnprocessed`, status = compensated |
| `schedulePayment` lança erro     | Saga compensa: `releaseLiquidity`, status = compensated |
| Compensação também falha         | status = failed, erro acumulado em `SagaState.error`    |

## Limitação Conhecida: Compensação de `schedule_payments`

A compensação de `schedule_payments` é um **no-op intencional**.

Pagamentos no estado `scheduled` não carregam fundos — são apenas instruções para o
`payment-scheduler`. Ao fazer rollback, a reserva de liquidez é liberada pela compensação de
`reserve_liquidity`. Os pagamentos órfãos serão cancelados automaticamente pelo mecanismo de
expiração do `payment-scheduler`.

Se cancelamento imediato for necessário, injete um callback `cancelPayment` em
`DepositSagaDependencies` e implemente a compensação no step `schedule_payments`.

## API Pública

```typescript
import {
  createDepositSagaSteps,
  defaultSagaJitterProvider,
} from '@/modules/deposit-saga';
import type {
  DepositSagaContext,
  DepositSagaDependencies,
  DepositSagaStepName,
  SagaJitterProvider,
} from '@/modules/deposit-saga';
```

