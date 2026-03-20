/**
 * Mixing feature types
 * Central type definitions for the mixing flow
 */

import type { MixSession } from "@/lib/mock-session";

export type MixingStep = "configure" | "confirm" | "deposit";

export interface Destination {
  id: string;
  address: string;
  percentage: number;
}

export interface MixingState {
  step: MixingStep;
  destinations: Destination[];
  delay: number[];
  session: MixSession | null;
  loading: boolean;
  error: string | null;
}

export interface MixingActions {
  addDestination: () => void;
  removeDestination: (id: string) => void;
  updateAddress: (id: string, address: string) => void;
  updatePercentage: (id: string, percentage: number) => void;
  setDelay: (delay: number[]) => void;
  goToConfirm: () => void;
  goToConfigure: () => void;
  confirmMix: () => Promise<void>;
  resetFlow: () => void;
}

export interface MixingDerivedState {
  canProceed: boolean;
  totalPercentage: number;
  allAddressesValid: boolean;
}
