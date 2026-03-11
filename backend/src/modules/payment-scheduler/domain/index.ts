/**
 * Payment Scheduler - Domain Layer
 *
 * Entities, value objects, policies, events, and errors.
 */

// Entities
export { ScheduledPayment } from './entities/scheduled-payment.entity';
export type { PaymentStatus } from './entities/scheduled-payment.entity';
export { PaymentOrder } from './entities/payment-order.entity';
export { PaymentWindow } from './entities/payment-window.entity';

// Value Objects
export { ScheduledPaymentId } from './value-objects/scheduled-payment-id.vo';
export { DestinationReference } from './value-objects/destination-reference.vo';
export { ExecutionTime } from './value-objects/execution-time.vo';

// Policies
export { PaymentDelayPolicy } from './policies/payment-delay.policy';
export { ExecutionEligibilityPolicy } from './policies/execution-eligibility.policy';
export { SchedulingWindowPolicy } from './policies/scheduling-window.policy';

// Events
export type { PaymentScheduledEvent } from './events/payment-scheduled.event';
export { createPaymentScheduledEvent } from './events/payment-scheduled.event';
export type { PaymentDueEvent } from './events/payment-due.event';
export { createPaymentDueEvent } from './events/payment-due.event';
export type { PaymentExecutedEvent } from './events/payment-executed.event';
export { createPaymentExecutedEvent } from './events/payment-executed.event';
export type { PaymentCancelledEvent } from './events/payment-cancelled.event';
export { createPaymentCancelledEvent } from './events/payment-cancelled.event';

// Errors
export { PaymentAlreadyExecutedError } from './errors/payment-already-executed.error';
export { PaymentNotDueError } from './errors/payment-not-due.error';
export { InvalidScheduleWindowError } from './errors/invalid-schedule-window.error';
