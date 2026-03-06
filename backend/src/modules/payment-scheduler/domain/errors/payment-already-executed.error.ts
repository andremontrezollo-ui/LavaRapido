export class PaymentAlreadyExecutedError extends Error {
  constructor(paymentId: string) { super(`Payment ${paymentId} already executed`); this.name = 'PaymentAlreadyExecutedError'; }
}
