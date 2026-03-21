/**
 * Deterministic Time Adapter for testing
 */

import type { PaymentClock } from '../../application/ports/clock.port';

export class DeterministicTimeAdapter implements PaymentClock {
  private current: Date;

  constructor(initial: Date = new Date()) { this.current = new Date(initial); }

  now(): Date { return new Date(this.current); }
  advance(seconds: number): void { this.current = new Date(this.current.getTime() + seconds * 1000); }
  set(time: Date): void { this.current = new Date(time); }
}
