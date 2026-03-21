export class PaymentNotDueError extends Error {
  constructor(paymentId: string) { super(`Payment ${paymentId} is not yet due`); this.name = 'PaymentNotDueError'; }
}
