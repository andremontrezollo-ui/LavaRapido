/**
 * Distribution utilities for mixing destinations
 * Pure functions — no React dependencies, fully testable
 */

import type { Destination } from "../types/mixing.types";

const MIN_PERCENTAGE = 10;

/**
 * Clamps a number between min and max (inclusive).
 * Treats NaN as min.
 */
function clamp(value: number, min: number, max: number): number {
  const safe = isNaN(value) ? min : value;
  return Math.max(min, Math.min(max, safe));
}

/**
 * Ensures all percentages are integers and sum exactly to 100.
 * Distributes any remainder to the last destination.
 */
export function redistributePercentages(destinations: Destination[]): Destination[] {
  const count = destinations.length;
  if (count === 0) return [];
  if (count === 1) {
    return [{ ...destinations[0], percentage: 100 }];
  }

  const baseShare = Math.floor(100 / count);
  const remainder = 100 - baseShare * count;

  return destinations.map((dest, index) => ({
    ...dest,
    percentage: index === count - 1 ? baseShare + remainder : baseShare,
  }));
}

/**
 * Adds a new empty destination and rebalances all percentages evenly.
 * Returns unchanged list if max is already reached.
 */
export function addDestinationWithRebalance(
  destinations: Destination[],
  maxDestinations: number
): Destination[] {
  if (destinations.length >= maxDestinations) return destinations;

  const newDest: Destination = {
    id: Date.now().toString(),
    address: "",
    percentage: 0,
  };

  return redistributePercentages([...destinations, newDest]);
}

/**
 * Removes a destination by id and rebalances remaining percentages evenly.
 * Returns unchanged list if only one destination remains.
 */
export function removeDestinationWithRebalance(
  destinations: Destination[],
  id: string
): Destination[] {
  if (destinations.length <= 1) return destinations;

  const filtered = destinations.filter((d) => d.id !== id);
  return redistributePercentages(filtered);
}

/**
 * Updates the percentage for one destination and adjusts the others
 * proportionally so that the total always equals 100.
 *
 * Rules:
 * - The changed destination's percentage is clamped to [MIN_PERCENTAGE, 100 - (others * MIN_PERCENTAGE)]
 * - Remaining percentage is distributed proportionally among the other destinations
 * - Each other destination is guaranteed at least MIN_PERCENTAGE
 * - The last other destination absorbs any rounding remainder
 */
export function updatePercentageWithRebalance(
  destinations: Destination[],
  id: string,
  rawValue: number
): Destination[] {
  if (destinations.length === 1) {
    return [{ ...destinations[0], percentage: 100 }];
  }

  const others = destinations.filter((d) => d.id !== id);
  const maxForChanged = 100 - others.length * MIN_PERCENTAGE;
  const newValue = clamp(Math.round(rawValue), MIN_PERCENTAGE, maxForChanged);
  const remaining = 100 - newValue;

  // Compute the sum of the current percentages of the other destinations
  // so we can redistribute proportionally while keeping the ratios.
  const othersTotal = others.reduce((sum, d) => sum + d.percentage, 0);

  let allocated = 0;
  const adjustedOthers = others.map((dest, index) => {
    const isLast = index === others.length - 1;

    if (isLast) {
      // Last one absorbs the rounding remainder
      const lastPercentage = clamp(remaining - allocated, MIN_PERCENTAGE, remaining - (others.length - 1) * MIN_PERCENTAGE);
      return { ...dest, percentage: lastPercentage };
    }

    const proportion = othersTotal > 0 ? dest.percentage / othersTotal : 1 / others.length;
    const share = clamp(Math.round(proportion * remaining), MIN_PERCENTAGE, remaining - (others.length - 1 - index) * MIN_PERCENTAGE);
    allocated += share;
    return { ...dest, percentage: share };
  });

  return destinations.map((d) => {
    if (d.id === id) return { ...d, percentage: newValue };
    const adjusted = adjustedOthers.find((a) => a.id === d.id);
    return adjusted ?? d;
  });
}
