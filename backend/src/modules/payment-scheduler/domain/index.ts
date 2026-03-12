/**
 * Payment Scheduler - Domain Layer
 *
 * Canonical exports: entities, value objects, events, policies, errors.
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

// Events
export type { PaymentScheduledEvent } from './events/payment-scheduled.event';
export { createPaymentScheduledEvent } from './events/payment-scheduled.event';
export type { PaymentDueEvent } from './events/payment-due.event';
export { createPaymentDueEvent } from './events/payment-due.event';
export type { PaymentExecutedEvent } from './events/payment-executed.event';
export { createPaymentExecutedEvent } from './events/payment-executed.event';
export type { PaymentCancelledEvent } from './events/payment-cancelled.event';
export { createPaymentCancelledEvent } from './events/payment-cancelled.event';

// Policies
export { PaymentDelayPolicy } from './policies/payment-delay.policy';
export { ExecutionEligibilityPolicy } from './policies/execution-eligibility.policy';
export { SchedulingWindowPolicy } from './policies/scheduling-window.policy';
export { RateLimitPolicy } from './policies/RateLimitPolicy';
export type { RateLimitInput, RateLimitResult } from './policies/RateLimitPolicy';

// Errors
export { PaymentAlreadyExecutedError } from './errors/payment-already-executed.error';
export { PaymentNotDueError } from './errors/payment-not-due.error';
export { InvalidScheduleWindowError } from './errors/invalid-schedule-window.error';
