# Module: payment-scheduler

> **Source:** [`backend/src/modules/payment-scheduler/`](../../src/modules/payment-scheduler/)  
> **Related:** [System Overview](../system-overview.md) · [Architecture](../architecture.md)

---

## Purpose

The `payment-scheduler` module accepts payment orders, schedules them for future execution with randomized delay, tracks their lifecycle state, and publishes events when payments become due or are executed. This randomized delay is a core privacy mechanism — it prevents correlation between deposit timing and output timing.

---

## Domain Model

### Entities

| Entity | File | Description |
|--------|------|-------------|
| `ScheduledPayment` | [`domain/entities/scheduled-payment.entity.ts`](../../src/modules/payment-scheduler/domain/entities/scheduled-payment.entity.ts) | A payment with scheduled execution time and lifecycle state |
| `PaymentOrder` | [`domain/entities/payment-order.entity.ts`](../../src/modules/payment-scheduler/domain/entities/payment-order.entity.ts) | An instruction to pay a specific amount to a destination |
| `PaymentWindow` | [`domain/entities/payment-window.entity.ts`](../../src/modules/payment-scheduler/domain/entities/payment-window.entity.ts) | Time window within which a payment may execute |

### Value Objects

| Value Object | File | Description |
|-------------|------|-------------|
| `ExecutionTime` | [`domain/value-objects/execution-time.vo.ts`](../../src/modules/payment-scheduler/domain/value-objects/execution-time.vo.ts) | Scheduled execution timestamp |
| `ScheduledPaymentId` | [`domain/value-objects/scheduled-payment-id.vo.ts`](../../src/modules/payment-scheduler/domain/value-objects/scheduled-payment-id.vo.ts) | Unique payment identifier |
| `DestinationReference` | [`domain/value-objects/destination-reference.vo.ts`](../../src/modules/payment-scheduler/domain/value-objects/destination-reference.vo.ts) | Opaque reference to the payment destination |

### Domain Events

| Event | File | Description |
|-------|------|-------------|
| `PAYMENT_SCHEDULED` | [`domain/events/payment-scheduled.event.ts`](../../src/modules/payment-scheduler/domain/events/payment-scheduled.event.ts) | Payment accepted and scheduled for future execution |
| `PAYMENT_DUE` | [`domain/events/payment-due.event.ts`](../../src/modules/payment-scheduler/domain/events/payment-due.event.ts) | Payment execution time has arrived |
| `PAYMENT_EXECUTED` | [`domain/events/payment-executed.event.ts`](../../src/modules/payment-scheduler/domain/events/payment-executed.event.ts) | Payment has been executed (success or failure indicated by `success` field) |
| `PAYMENT_CANCELLED` | [`domain/events/payment-cancelled.event.ts`](../../src/modules/payment-scheduler/domain/events/payment-cancelled.event.ts) | Payment was cancelled before execution |

### Domain Errors

| Error | File |
|-------|------|
| `InvalidScheduleWindowError` | [`domain/errors/invalid-schedule-window.error.ts`](../../src/modules/payment-scheduler/domain/errors/invalid-schedule-window.error.ts) |
| `PaymentAlreadyExecutedError` | [`domain/errors/payment-already-executed.error.ts`](../../src/modules/payment-scheduler/domain/errors/payment-already-executed.error.ts) |
| `PaymentNotDueError` | [`domain/errors/payment-not-due.error.ts`](../../src/modules/payment-scheduler/domain/errors/payment-not-due.error.ts) |

### Policies

| Policy | File | Description |
|--------|------|-------------|
| `PaymentDelayPolicy` | [`domain/policies/payment-delay.policy.ts`](../../src/modules/payment-scheduler/domain/policies/payment-delay.policy.ts) | Calculates randomized delay for payment execution (60–360s jitter) |
| `SchedulingWindowPolicy` | [`domain/policies/scheduling-window.policy.ts`](../../src/modules/payment-scheduler/domain/policies/scheduling-window.policy.ts) | Validates the scheduling window is acceptable |
| `ExecutionEligibilityPolicy` | [`domain/policies/execution-eligibility.policy.ts`](../../src/modules/payment-scheduler/domain/policies/execution-eligibility.policy.ts) | Determines whether a payment is eligible for execution |

---

## Application Layer

### Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `SchedulePaymentUseCase` | [`application/use-cases/schedule-payment.usecase.ts`](../../src/modules/payment-scheduler/application/use-cases/schedule-payment.usecase.ts) | Schedules a new payment with delay |
| `GetDuePaymentsUseCase` | [`application/use-cases/get-due-payments.usecase.ts`](../../src/modules/payment-scheduler/application/use-cases/get-due-payments.usecase.ts) | Returns payments due for execution |
| `MarkPaymentExecutedUseCase` | [`application/use-cases/mark-payment-executed.usecase.ts`](../../src/modules/payment-scheduler/application/use-cases/mark-payment-executed.usecase.ts) | Marks a payment as executed and publishes `PAYMENT_EXECUTED` |
| `CancelScheduledPaymentUseCase` | [`application/use-cases/cancel-scheduled-payment.usecase.ts`](../../src/modules/payment-scheduler/application/use-cases/cancel-scheduled-payment.usecase.ts) | Cancels a scheduled payment |
| `ReschedulePaymentUseCase` | [`application/use-cases/reschedule-payment.usecase.ts`](../../src/modules/payment-scheduler/application/use-cases/reschedule-payment.usecase.ts) | Reschedules a payment to a new execution time |

**Idempotency:**
- `SchedulePaymentUseCase` is guarded with key `schedule:{destination}:{amount}:{delay}`
- `MarkPaymentExecutedUseCase` is guarded with key `execute-payment:{paymentId}`

### Ports

| Port | File |
|------|------|
| `ScheduledPaymentRepositoryPort` | [`application/ports/scheduled-payment-repository.port.ts`](../../src/modules/payment-scheduler/application/ports/scheduled-payment-repository.port.ts) |
| `EventPublisherPort` | [`application/ports/event-publisher.port.ts`](../../src/modules/payment-scheduler/application/ports/event-publisher.port.ts) |
| `ClockPort` | [`application/ports/clock.port.ts`](../../src/modules/payment-scheduler/application/ports/clock.port.ts) |

### DTOs

| DTO | File |
|-----|------|
| `SchedulePaymentRequest` | [`application/dtos/schedule-payment.request.ts`](../../src/modules/payment-scheduler/application/dtos/schedule-payment.request.ts) |
| `ScheduledPaymentDto` | [`application/dtos/scheduled-payment.dto.ts`](../../src/modules/payment-scheduler/application/dtos/scheduled-payment.dto.ts) |
| `PaymentStatusDto` | [`application/dtos/payment-status.dto.ts`](../../src/modules/payment-scheduler/application/dtos/payment-status.dto.ts) |

---

## Infrastructure Layer

| Adapter | File | Description |
|---------|------|-------------|
| `DeterministicTimeAdapter` | [`infra/adapters/deterministic-time.adapter.ts`](../../src/modules/payment-scheduler/infra/adapters/deterministic-time.adapter.ts) | Test double for time control |
| `MockExecutionQueueAdapter` | [`infra/adapters/mock-execution-queue.adapter.ts`](../../src/modules/payment-scheduler/infra/adapters/mock-execution-queue.adapter.ts) | Test double for payment execution queue |
| `ScheduledPaymentRepository` | [`infra/repositories/scheduled-payment.repository.ts`](../../src/modules/payment-scheduler/infra/repositories/scheduled-payment.repository.ts) | In-memory payment persistence |
| `ScheduledPaymentMapper` | [`infra/mappers/scheduled-payment.mapper.ts`](../../src/modules/payment-scheduler/infra/mappers/scheduled-payment.mapper.ts) | Domain ↔ persistence mapping |

---

## Events Published

| Event | Trigger | Key Fields |
|-------|---------|-----------|
| `PAYMENT_SCHEDULED` | `SchedulePaymentUseCase` succeeds | `paymentId`, `scheduledFor` |
| `PAYMENT_DUE` | Scheduler identifies due payment | `paymentId` |
| `PAYMENT_EXECUTED` | `MarkPaymentExecutedUseCase` completes | `paymentId`, `success` |
| `PAYMENT_CANCELLED` | `CancelScheduledPaymentUseCase` completes | `paymentId`, `reason` |

---

## Events Consumed

| Event | Source Module | Action |
|-------|-------------|--------|
| `LIQUIDITY_ALLOCATED` | `liquidity-pool` | Triggers `SchedulePaymentUseCase` for each destination address |

---

## Tests

| Test File | Description |
|-----------|-------------|
| [`__tests__/payment-delay.policy.test.ts`](../../src/modules/payment-scheduler/__tests__/payment-delay.policy.test.ts) | Unit tests for delay policy |
| [`__tests__/schedule-payment.usecase.test.ts`](../../src/modules/payment-scheduler/__tests__/schedule-payment.usecase.test.ts) | Unit tests for scheduling use case |

---

## Operational Notes

- **Payment delay:** `PaymentDelayPolicy` applies a randomized delay of 60–360 seconds per destination (jitter = `Math.floor(Math.random() * 300) + 60`). This is the primary anti-correlation mechanism.
- **Multiple destinations:** The deposit saga splits the amount across all destination addresses (`perDestinationAmount = amount / destinations.length`) and schedules one payment per destination.
- **Due payment polling:** `SecureJobScheduler` polls for due payments using `GetDuePaymentsUseCase` and executes them via `MarkPaymentExecutedUseCase`.
- **Idempotency** ensures a payment is scheduled and executed at most once per key, even if events are re-delivered.
- **Compensation:** If payment scheduling fails in the saga, the compensation step is a no-op — scheduled payments in `SCHEDULED` state will expire without execution.
