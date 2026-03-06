import { ScheduledPaymentId } from '../value-objects/scheduled-payment-id.vo';
import { DestinationReference } from '../value-objects/destination-reference.vo';
import { ExecutionTime } from '../value-objects/execution-time.vo';

export type PaymentStatus = 'scheduled' | 'due' | 'executed' | 'cancelled' | 'failed';

export class ScheduledPayment {
  constructor(
    readonly id: ScheduledPaymentId,
    readonly destination: DestinationReference,
    readonly amount: number,
    private _scheduledFor: ExecutionTime,
    private _status: PaymentStatus,
    readonly createdAt: Date,
    private _executedAt: Date | null = null,
    private _cancelledAt: Date | null = null,
  ) {}

  get scheduledFor(): ExecutionTime { return this._scheduledFor; }
  get status(): PaymentStatus { return this._status; }
  get executedAt(): Date | null { return this._executedAt; }

  isDue(now: Date): boolean {
    return this._status === 'scheduled' && this._scheduledFor.isPast(now);
  }

  markDue(): void { this._status = 'due'; }

  markExecuted(now: Date): void {
    this._status = 'executed';
    this._executedAt = now;
  }

  markCancelled(now: Date): void {
    this._status = 'cancelled';
    this._cancelledAt = now;
  }

  markFailed(): void { this._status = 'failed'; }

  reschedule(newTime: ExecutionTime): void {
    if (this._status !== 'scheduled') throw new Error('Can only reschedule scheduled payments');
    this._scheduledFor = newTime;
  }

  canBeExecuted(): boolean {
    return this._status === 'due' || this._status === 'scheduled';
  }
}
