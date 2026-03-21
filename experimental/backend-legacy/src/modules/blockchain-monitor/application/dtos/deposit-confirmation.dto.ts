/**
 * DepositConfirmation DTO
 */

export interface DepositConfirmationDto {
  readonly txId: string;
  readonly confirmations: number;
  readonly isConfirmed: boolean;
  readonly requiredConfirmations: number;
  readonly confirmedAt?: string;
}
