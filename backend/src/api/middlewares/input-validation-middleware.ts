/**
 * Input Validation Middleware — validates request bodies against Zod schemas.
 */

export interface ValidationSchema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: { errors: Array<{ path: (string | number)[]; message: string }> } };
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

export class InputValidationMiddleware {
  validate<T>(schema: ValidationSchema<T>, input: unknown): ValidationResult<T> {
    const result = schema.safeParse(input);

    if (result.success) {
      return { valid: true, data: result.data };
    }

    const errors = result.error.errors.map(e => ({
      field: e.path.join('.') || 'root',
      message: e.message,
    }));

    return { valid: false, errors };
  }
}

/**
 * Deposit request schema compatible with Zod's interface.
 * Validates: amount (positive), walletAddress (string), networkId (string), idempotencyKey (string).
 */
export interface DepositInput {
  amount: number;
  walletAddress: string;
  networkId: string;
  idempotencyKey: string;
}

export const depositInputSchema: ValidationSchema<DepositInput> = {
  safeParse(data: unknown) {
    if (typeof data !== 'object' || data === null) {
      return {
        success: false,
        error: { errors: [{ path: [], message: 'Body must be an object' }] },
      };
    }

    const obj = data as Record<string, unknown>;
    const errors: Array<{ path: (string | number)[]; message: string }> = [];

    if (typeof obj.amount !== 'number' || obj.amount <= 0) {
      errors.push({ path: ['amount'], message: 'amount must be a positive number' });
    }
    if (typeof obj.walletAddress !== 'string' || obj.walletAddress.trim() === '') {
      errors.push({ path: ['walletAddress'], message: 'walletAddress is required' });
    }
    if (typeof obj.networkId !== 'string' || obj.networkId.trim() === '') {
      errors.push({ path: ['networkId'], message: 'networkId is required' });
    }
    if (typeof obj.idempotencyKey !== 'string' || obj.idempotencyKey.trim() === '') {
      errors.push({ path: ['idempotencyKey'], message: 'idempotencyKey is required' });
    }

    if (errors.length > 0) {
      return { success: false, error: { errors } };
    }

    return {
      success: true,
      data: {
        amount: obj.amount as number,
        walletAddress: (obj.walletAddress as string).trim(),
        networkId: (obj.networkId as string).trim(),
        idempotencyKey: (obj.idempotencyKey as string).trim(),
      },
    };
  },
};
