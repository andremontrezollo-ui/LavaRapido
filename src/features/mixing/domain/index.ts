/**
 * Mixing Domain — pure business rules, no I/O, no framework dependencies.
 *
 * Exposes:
 *  - DestinationAddress — value type for a recipient address + percentage
 *  - validation functions used both in the UI and in tests
 */

import { isValidBitcoinAddress } from "@/lib/validation";
import { SERVICE_CONFIG } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Value types
// ---------------------------------------------------------------------------

export interface DestinationAddress {
  id: string;
  address: string;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Business rules
// ---------------------------------------------------------------------------

/** True when all addresses pass Bitcoin address validation. */
export function allAddressesValid(destinations: DestinationAddress[]): boolean {
  return destinations.every((d) => d.address.trim() !== "" && isValidBitcoinAddress(d.address));
}

/** True when percentages sum to exactly 100. */
export function totalIsHundred(destinations: DestinationAddress[]): number {
  return destinations.reduce((sum, d) => sum + d.percentage, 0);
}

/** True when the configuration is ready to submit. */
export function canSubmit(destinations: DestinationAddress[]): boolean {
  return allAddressesValid(destinations) && totalIsHundred(destinations) === 100;
}

/** Redistribute percentages evenly after adding a destination. */
export function addDestination(
  current: DestinationAddress[]
): DestinationAddress[] {
  if (current.length >= SERVICE_CONFIG.maxDestinations) return current;
  const newPct = Math.floor(100 / (current.length + 1));
  const updated = current.map((d) => ({ ...d, percentage: newPct }));
  updated.push({
    id: Date.now().toString(),
    address: "",
    percentage: 100 - newPct * current.length,
  });
  return updated;
}

/** Remove a destination and redistribute percentages evenly. */
export function removeDestination(
  current: DestinationAddress[],
  id: string
): DestinationAddress[] {
  if (current.length <= 1) return current;
  const filtered = current.filter((d) => d.id !== id);
  const perAddr = Math.floor(100 / filtered.length);
  const remainder = 100 - perAddr * (filtered.length - 1);
  return filtered.map((d, i) => ({
    ...d,
    percentage: i === filtered.length - 1 ? remainder : perAddr,
  }));
}
