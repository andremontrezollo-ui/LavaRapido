/**
 * Mock Execution Queue Adapter
 */

export class MockExecutionQueueAdapter {
  private queue: Array<{ paymentId: string; destination: string; amount: number }> = [];

  enqueue(paymentId: string, destination: string, amount: number): void {
    this.queue.push({ paymentId, destination, amount });
  }

  dequeue(): { paymentId: string; destination: string; amount: number } | null {
    return this.queue.shift() ?? null;
  }

  size(): number { return this.queue.length; }
}
