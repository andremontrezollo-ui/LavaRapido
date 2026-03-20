/**
 * useMixingFlow — central state hook for the mixing wizard
 *
 * Owns all state and business logic for the mixing flow.
 * The MixingPage component should only call functions from this hook.
 */

import { useState, useCallback, useMemo } from "react";
import { SERVICE_CONFIG } from "@/lib/constants";
import { isValidBitcoinAddress } from "@/lib/validation";
import { createMixSession } from "@/lib/api";
import type { MixingStep, Destination, MixingState, MixingActions, MixingDerivedState } from "../types/mixing.types";
import {
  addDestinationWithRebalance,
  removeDestinationWithRebalance,
  updatePercentageWithRebalance,
} from "../utils/distribution";

const INITIAL_DESTINATIONS: Destination[] = [
  { id: "1", address: "", percentage: 100 },
];

function buildInitialState(): MixingState {
  return {
    step: "configure",
    destinations: INITIAL_DESTINATIONS,
    delay: [SERVICE_CONFIG.defaultDelay],
    session: null,
    loading: false,
    error: null,
  };
}

export type UseMixingFlowReturn = MixingState & MixingActions & MixingDerivedState;

export function useMixingFlow(): UseMixingFlowReturn {
  const [step, setStep] = useState<MixingStep>("configure");
  const [destinations, setDestinations] = useState<Destination[]>(INITIAL_DESTINATIONS);
  const [delay, setDelay] = useState<number[]>([SERVICE_CONFIG.defaultDelay]);
  const [session, setSession] = useState<MixingState["session"]>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Derived state ──────────────────────────────────────────────────────────

  const totalPercentage = useMemo(
    () => destinations.reduce((sum, d) => sum + d.percentage, 0),
    [destinations]
  );

  const allAddressesValid = useMemo(
    () => destinations.every((d) => d.address !== "" && isValidBitcoinAddress(d.address)),
    [destinations]
  );

  const canProceed = allAddressesValid && totalPercentage === 100;

  // ── Actions ────────────────────────────────────────────────────────────────

  const addDestination = useCallback(() => {
    setDestinations((prev) =>
      addDestinationWithRebalance(prev, SERVICE_CONFIG.maxDestinations)
    );
  }, []);

  const removeDestination = useCallback((id: string) => {
    setDestinations((prev) => removeDestinationWithRebalance(prev, id));
  }, []);

  const updateAddress = useCallback((id: string, address: string) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, address: address.trim() } : d))
    );
  }, []);

  const updatePercentage = useCallback((id: string, percentage: number) => {
    setDestinations((prev) =>
      updatePercentageWithRebalance(prev, id, percentage)
    );
  }, []);

  const goToConfirm = useCallback(() => {
    if (canProceed) setStep("confirm");
  }, [canProceed]);

  const goToConfigure = useCallback(() => {
    setStep("configure");
    setError(null);
  }, []);

  const confirmMix = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await createMixSession();

    if (result.error) {
      setError(
        result.status === 429
          ? "Too many requests. Please wait a few minutes."
          : result.error.message
      );
      setLoading(false);
      return;
    }

    if (result.data) {
      setSession({
        sessionId: result.data.sessionId,
        depositAddress: result.data.depositAddress,
        createdAt: new Date(result.data.createdAt),
        expiresAt: new Date(result.data.expiresAt),
        status: "pending_deposit",
      });
      setStep("deposit");
    }
    setLoading(false);
  }, []);

  const resetFlow = useCallback(() => {
    const initial = buildInitialState();
    setStep(initial.step);
    setDestinations(initial.destinations);
    setDelay(initial.delay);
    setSession(initial.session);
    setError(initial.error);
  }, []);

  return {
    // State
    step,
    destinations,
    delay,
    session,
    loading,
    error,

    // Derived
    totalPercentage,
    allAddressesValid,
    canProceed,

    // Actions
    addDestination,
    removeDestination,
    updateAddress,
    updatePercentage,
    setDelay,
    goToConfirm,
    goToConfigure,
    confirmMix,
    resetFlow,
  };
}
