/**
 * Mock Pool Balance Adapter
 */

export class MockPoolBalanceAdapter {
  private balance = 10.0;

  getBalance(): number { return this.balance; }
  setBalance(value: number): void { this.balance = value; }
}
