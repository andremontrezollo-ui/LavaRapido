# Deposit Processing Saga

Coordinates the full deposit-to-payment flow across modules:

1. **blockchain-monitor**: Confirms the deposit has sufficient confirmations
2. **liquidity-pool**: Reserves liquidity from the pool
3. **payment-scheduler**: Schedules payments to destination addresses

## Compensation Strategy

- If payment scheduling fails → release reserved liquidity
- If liquidity reservation fails → mark deposit as unprocessed
- All steps are idempotent and can be retried safely

## Events Flow

```
DEPOSIT_CONFIRMED → reserve_liquidity → LIQUIDITY_ALLOCATED → schedule_payments → PAYMENT_SCHEDULED
```
