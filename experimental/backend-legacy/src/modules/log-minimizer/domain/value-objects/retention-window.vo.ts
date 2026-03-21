/**
 * RetentionWindow Value Object
 */

export class RetentionWindow {
  private constructor(readonly durationSeconds: number) {}

  static create(seconds: number): RetentionWindow {
    if (seconds <= 0) throw new Error('Retention window must be positive');
    return new RetentionWindow(seconds);
  }

  static hours(h: number): RetentionWindow { return new RetentionWindow(h * 3600); }
  static days(d: number): RetentionWindow { return new RetentionWindow(d * 86400); }

  expiresAt(from: Date): Date {
    return new Date(from.getTime() + this.durationSeconds * 1000);
  }

  isExpired(createdAt: Date, now: Date): boolean {
    return now.getTime() > this.expiresAt(createdAt).getTime();
  }
}
