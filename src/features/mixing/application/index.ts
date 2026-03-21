/**
 * Mixing Application — orchestrates domain rules and infrastructure calls.
 *
 * No React, no fetch, no DOM.  Pure state transitions consumed by the UI.
 */

import { canSubmit, addDestination, removeDestination } from "@/features/mixing/domain/index";
import type { DestinationAddress } from "@/features/mixing/domain/index";
import type { MixSession } from "@/test/fixtures/mock-session";
import type { ApiResult } from "@/services/backend-client";
import type { MixSessionResponse } from "@/contracts/mix-session";
import { fromApiResponse } from "@/test/fixtures/mock-session";

export type { DestinationAddress };

export interface MixingState {
  step: "configure" | "confirm" | "deposit";
  destinations: DestinationAddress[];
  delay: number;
  session: MixSession | null;
  loading: boolean;
  error: string | null;
}

export function initialState(): MixingState {
  return {
    step: "configure",
    destinations: [{ id: "1", address: "", percentage: 100 }],
    delay: 2,
    session: null,
    loading: false,
    error: null,
  };
}

/** Compute derived validation flags from current state. */
export function deriveValidation(state: MixingState) {
  return {
    canProceed: canSubmit(state.destinations),
    total: state.destinations.reduce((s, d) => s + d.percentage, 0),
  };
}

/** Pure state transition: add a destination. */
export function applyAddDestination(state: MixingState): MixingState {
  return { ...state, destinations: addDestination(state.destinations) };
}

/** Pure state transition: remove a destination. */
export function applyRemoveDestination(
  state: MixingState,
  id: string
): MixingState {
  return { ...state, destinations: removeDestination(state.destinations, id) };
}

/** Pure state transition: update an address field. */
export function applyUpdateAddress(
  state: MixingState,
  id: string,
  address: string
): MixingState {
  return {
    ...state,
    destinations: state.destinations.map((d) =>
      d.id === id ? { ...d, address: address.trim() } : d
    ),
  };
}

/** Pure state transition: update a percentage field. */
export function applyUpdatePercentage(
  state: MixingState,
  id: string,
  percentage: number
): MixingState {
  return {
    ...state,
    destinations: state.destinations.map((d) =>
      d.id === id ? { ...d, percentage } : d
    ),
  };
}

/** Resolve the API result into the next state (called after the async call). */
export function applySessionResult(
  state: MixingState,
  result: ApiResult<MixSessionResponse>
): MixingState {
  if (result.error) {
    const message =
      result.status === 429
        ? "Too many requests. Please wait a few minutes."
        : result.error.message;
    return { ...state, loading: false, error: message };
  }
  if (result.data) {
    return {
      ...state,
      loading: false,
      error: null,
      session: fromApiResponse(result.data),
      step: "deposit",
    };
  }
  return { ...state, loading: false };
}
