/**
 * Log Minimizer Module
 * 
 * Responsible for log classification, field redaction, retention enforcement, and purging.
 * 
 * Consumes: PAYMENT_EXECUTED (from payment-scheduler) for log/audit recording
 * Emits: LOG_REDACTED, LOG_PURGED
 */

export * from './domain';
export * from './application';
export * from './infra';
