import { ExecutionTime } from '../value-objects/execution-time.vo';

export class PaymentWindow {
  constructor(
    readonly start: ExecutionTime,
    readonly end: ExecutionTime,
  ) {}

  contains(time: Date): boolean {
    return time.getTime() >= this.start.value.getTime() && time.getTime() <= this.end.value.getTime();
  }

  durationSeconds(): number {
    return (this.end.value.getTime() - this.start.value.getTime()) / 1000;
  }
}
