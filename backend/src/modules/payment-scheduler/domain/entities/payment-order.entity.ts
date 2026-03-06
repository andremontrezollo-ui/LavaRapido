export class PaymentOrder {
  constructor(
    readonly id: string,
    readonly paymentId: string,
    readonly amount: number,
    readonly destination: string,
    readonly orderedAt: Date,
    private _success: boolean | null = null,
  ) {}

  get success(): boolean | null { return this._success; }

  markSuccess(): void { this._success = true; }
  markFailure(): void { this._success = false; }
}
