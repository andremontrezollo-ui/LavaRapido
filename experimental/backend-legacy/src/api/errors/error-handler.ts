/**
 * Centralized Error Handler — maps domain errors to safe HTTP responses.
 */

import { errorResponse } from '../../shared/http/api-response';
import { HttpStatus } from '../../shared/http/HttpStatus';
import type { Logger } from '../../shared/logging';

interface ErrorMapping {
  statusCode: number;
  code: string;
}

const ERROR_MAP: Record<string, ErrorMapping> = {
  'InvalidAddressError': { statusCode: HttpStatus.BAD_REQUEST, code: 'INVALID_ADDRESS' },
  'AddressExpiredError': { statusCode: HttpStatus.GONE, code: 'ADDRESS_EXPIRED' },
  'InvalidTxIdError': { statusCode: HttpStatus.BAD_REQUEST, code: 'INVALID_TXID' },
  'InsufficientLiquidityError': { statusCode: HttpStatus.CONFLICT, code: 'INSUFFICIENT_LIQUIDITY' },
  'InvalidAllocationError': { statusCode: HttpStatus.BAD_REQUEST, code: 'INVALID_ALLOCATION' },
  'PaymentNotDueError': { statusCode: HttpStatus.CONFLICT, code: 'PAYMENT_NOT_DUE' },
  'PaymentAlreadyExecutedError': { statusCode: HttpStatus.CONFLICT, code: 'ALREADY_EXECUTED' },
  'InvalidScheduleWindowError': { statusCode: HttpStatus.BAD_REQUEST, code: 'INVALID_SCHEDULE' },
  'InvalidLogEntryError': { statusCode: HttpStatus.BAD_REQUEST, code: 'INVALID_LOG_ENTRY' },
};

export class ErrorHandler {
  constructor(private readonly logger: Logger) {}

  handle(error: unknown, correlationId?: string): { status: number; body: ReturnType<typeof errorResponse> } {
    if (error instanceof Error) {
      const mapping = ERROR_MAP[error.constructor.name];
      if (mapping) {
        return {
          status: mapping.statusCode,
          body: errorResponse(mapping.code, error.message, undefined, correlationId),
        };
      }

      // Known but unmapped errors
      this.logger.error('Unhandled domain error', {
        errorName: error.constructor.name,
        correlationId,
      });

      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', undefined, correlationId),
      };
    }

    this.logger.error('Unknown error type', { correlationId });
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', undefined, correlationId),
    };
  }
}
