export class ExecutionTime {
  private constructor(readonly value: Date) {}
  static create(time: Date): ExecutionTime {
    return new ExecutionTime(new Date(time));
  }
  static fromNowPlus(seconds: number): ExecutionTime {
    return new ExecutionTime(new Date(Date.now() + seconds * 1000));
  }
  isPast(now: Date): boolean { return now.getTime() >= this.value.getTime(); }
  isFuture(now: Date): boolean { return now.getTime() < this.value.getTime(); }
}
