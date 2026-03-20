/**
 * Distribution utilities for mixing destinations
 * Pure functions for percentage calculation and redistribution
 */

import type { DestinationAddress } from "@/components/mixing/DestinationList";

/**
 * Redistributes percentages evenly across all destinations.
 * The last destination absorbs any remainder to ensure total = 100.
 */
export function distributePercentages(
  destinations: DestinationAddress[]
): DestinationAddress[] {
  if (destinations.length === 0) return [];
  const count = destinations.length;
  const base = Math.floor(100 / count);
  const last = 100 - base * (count - 1);
  return destinations.map((d, i) => ({
    ...d,
    percentage: i === count - 1 ? last : base,
  }));
}

/**
 * Returns the sum of all destination percentages.
 */
export function getTotalPercentage(destinations: DestinationAddress[]): number {
  return destinations.reduce((sum, d) => sum + d.percentage, 0);
}
