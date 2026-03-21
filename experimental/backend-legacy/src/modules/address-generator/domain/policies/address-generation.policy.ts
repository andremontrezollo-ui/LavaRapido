/**
 * Address Generation Policy
 * 
 * Pure business rule: determines constraints and validation for address generation.
 */

import type { ExplainablePolicy } from '../../../../shared/policies';
import type { AddressNetwork } from '../value-objects/bitcoin-address.vo';

export interface GenerationInput {
  network: AddressNetwork;
  existingActiveCount: number;
}

export interface GenerationResult {
  allowed: boolean;
  maxActive: number;
  remaining: number;
}

const MAX_ACTIVE_PER_NETWORK: Record<AddressNetwork, number> = {
  mainnet: 5,
  testnet: 20,
};

export class AddressGenerationPolicy implements ExplainablePolicy<GenerationInput, GenerationResult> {
  evaluate(input: GenerationInput): GenerationResult {
    const maxActive = MAX_ACTIVE_PER_NETWORK[input.network];
    const remaining = Math.max(0, maxActive - input.existingActiveCount);
    return {
      allowed: input.existingActiveCount < maxActive,
      maxActive,
      remaining,
    };
  }

  explain(input: GenerationInput): string {
    const r = this.evaluate(input);
    if (r.allowed) {
      return `Generation allowed on ${input.network}. ${r.remaining} of ${r.maxActive} slots remaining.`;
    }
    return `Generation denied on ${input.network}. Maximum ${r.maxActive} active addresses reached.`;
  }
}
