# Payment Scheduler Module

## Responsabilidade

Agendar, gerenciar e executar pagamentos com atraso configurável e jitter configurável para privacidade.

## Arquitetura Canônica

```
domain/      → Entidades, Value Objects, Events, Policies, Errors
application/ → Ports, DTOs, Use Cases
infra/       → Repositories, Adapters, Mappers
```

## Conceitos de Domínio

### Entidades
- `ScheduledPayment` — pagamento agendado com ciclo de vida explícito
- `PaymentOrder` — ordem de execução derivada de um `ScheduledPayment`
- `PaymentWindow` — janela temporal de execução

### Value Objects
- `ScheduledPaymentId` — identificador único do pagamento
- `DestinationReference` — endereço de destino validado
- `ExecutionTime` — instante de execução com guards temporais

### Policies
- `PaymentDelayPolicy` — aplica delay mínimo/máximo e jitter; requer `JitterProvider` injetável
- `ExecutionEligibilityPolicy` — valida se um pagamento pode ser executado
- `SchedulingWindowPolicy` — verifica se o instante atual está dentro da janela
- `RateLimitPolicy` — controle de taxa de requisições

### Estados (`PaymentStatus`)
```
scheduled → due → executed
         → cancelled
         → failed
```

## Eventos

| Evento             | Tipo        | Descrição                                      |
|--------------------|-------------|------------------------------------------------|
| `PAYMENT_SCHEDULED`| Emitido     | Pagamento foi agendado com sucesso             |
| `PAYMENT_DUE`      | Emitido     | Pagamento entrou na janela de execução         |
| `PAYMENT_EXECUTED` | Emitido     | Pagamento foi executado (success: bool)        |
| `PAYMENT_CANCELLED`| Emitido     | Pagamento foi cancelado com motivo             |
| `LIQUIDITY_ALLOCATED` | Consumido | Trigger externo vindo do liquidity-pool     |

## Use Cases Públicos

| Use Case                    | Descrição                                         |
|-----------------------------|---------------------------------------------------|
| `SchedulePaymentUseCase`    | Agenda um novo pagamento com idempotência         |
| `GetDuePaymentsUseCase`     | Lista pagamentos prontos para execução            |
| `MarkPaymentExecutedUseCase`| Marca um pagamento como executado (com lock)      |
| `CancelScheduledPaymentUseCase` | Cancela um pagamento agendado              |
| `ReschedulePaymentUseCase`  | Redefine o instante de execução                   |

## Ports

- `ScheduledPaymentRepository` — persistência de pagamentos
- `PaymentEventPublisher` — publicação de eventos de domínio
- `PaymentClock` — abstração de tempo (injetável para testes)

## Failure Modes

| Cenário                         | Comportamento                              |
|---------------------------------|--------------------------------------------|
| Pagamento não encontrado        | Lança `Error` com mensagem descritiva      |
| Pagamento já executado          | Lança `PaymentAlreadyExecutedError`        |
| Cancelar pagamento já executado | Lança `Error`                              |
| Lock não adquirido (execução)   | Lança `Error` — retry deve ser feito pelo caller |
| Chave idempotente duplicada     | Retorna resultado anterior sem side-effects|

## Limitações Conhecidas

- `InMemoryScheduledPaymentRepository` é apenas para testes; sem persistência entre reinicios.
- `PaymentDelayPolicy` usa jitter via `Math.random()` por padrão; para testes determinísticos,
  injete um `JitterProvider` personalizado.
- Não há suporte a pagamentos recorrentes; cada agendamento é unitário.

