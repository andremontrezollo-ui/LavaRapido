/**
 * Pure distribution logic for mixing destinations.
 *
 * No React, no side effects — safe to unit-test in isolation.
 */

import type { DestinationAddress } from "./types";
import { isValidBitcoinAddress } from "@/lib/validation";

/**
 * Adds a new destination and redistributes percentages evenly.
 * Returns the unchanged array if maxDestinations is already reached.
 */
export function addDestination(
  destinations: DestinationAddress[],
  maxDestinations: number
): DestinationAddress[] {
  if (destinations.length >= maxDestinations) return destinations;

  const newPercentage = Math.floor(100 / (destinations.length + 1));
  const updated = destinations.map((d) => ({ ...d, percentage: newPercentage }));
  updated.push({
    id: Date.now().toString(),
    address: "",
    percentage: 100 - newPercentage * destinations.length,
  });
  return updated;
}

/**
 * Removes a destination by id and redistributes percentages evenly.
 * Returns the unchanged array if it would leave zero destinations.
 */
export function removeDestination(
  destinations: DestinationAddress[],
  id: string
): DestinationAddress[] {
  if (destinations.length <= 1) return destinations;

  const filtered = destinations.filter((d) => d.id !== id);
  const perAddress = Math.floor(100 / filtered.length);
  const remainder = 100 - perAddress * (filtered.length - 1);
  return filtered.map((d, i) => ({
    ...d,
    percentage: i === filtered.length - 1 ? remainder : perAddress,
  }));
}

/** Sum of all destination percentages. */
export function computeTotalPercentage(destinations: DestinationAddress[]): number {
  return destinations.reduce((sum, d) => sum + d.percentage, 0);
}

/**
 * Returns true when the configuration is ready to submit:
 * - Every address is non-empty and passes validation.
 * - Percentages sum exactly to 100.
 */
export function computeCanProceed(destinations: DestinationAddress[]): boolean {
  return (
    destinations.every((d) => d.address && isValidBitcoinAddress(d.address)) &&
    computeTotalPercentage(destinations) === 100
  );
}
