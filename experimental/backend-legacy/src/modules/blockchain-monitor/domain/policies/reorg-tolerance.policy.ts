/**
 * Reorg Tolerance Policy
 */

import type { Policy } from '../../../../shared/policies/Policy';

interface ReorgInput {
  previousBlockHeight: number;
  newBlockHeight: number;
  maxTolerableDepth: number;
}

interface ReorgResult {
  isReorg: boolean;
  depth: number;
  requiresAction: boolean;
}

export class ReorgTolerancePolicy implements Policy<ReorgInput, ReorgResult> {
  evaluate(input: ReorgInput): ReorgResult {
    const depth = input.previousBlockHeight - input.newBlockHeight;
    const isReorg = depth > 0;
    return {
      isReorg,
      depth: Math.max(0, depth),
      requiresAction: isReorg && depth > input.maxTolerableDepth,
    };
  }
}
