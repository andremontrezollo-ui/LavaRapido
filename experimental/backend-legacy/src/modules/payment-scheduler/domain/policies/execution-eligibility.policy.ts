import type { Policy } from '../../../../shared/policies/Policy';

interface EligibilityInput {
  status: string;
  isDue: boolean;
  hasLiquidity: boolean;
}

export class ExecutionEligibilityPolicy implements Policy<EligibilityInput, boolean> {
  evaluate(input: EligibilityInput): boolean {
    return (input.status === 'due' || input.status === 'scheduled') && input.isDue && input.hasLiquidity;
  }
}
