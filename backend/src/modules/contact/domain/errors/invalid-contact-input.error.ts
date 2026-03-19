import { DomainError } from '../../../../shared/errors/domain-error.ts';

export class InvalidContactInputError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}
