import { useState, useCallback, useMemo } from "react";
import type { MixingStep } from "@/components/mixing/ProgressSteps";
import type { DestinationAddress } from "@/components/mixing/DestinationList";
import { SERVICE_CONFIG } from "@/lib/constants";
import { isValidBitcoinAddress } from "@/lib/validation";
import { distributePercentages } from "@/lib/distribution";
import { createMixSession } from "@/lib/api";
import type { MixSession } from "@/lib/mock-session";

export function useMixingFlow() {
  const [step, setStep] = useState<MixingStep>("configure");
  const [destinations, setDestinations] = useState<DestinationAddress[]>([
    { id: "1", address: "", percentage: 100 },
  ]);
  const [delay, setDelay] = useState<number[]>([SERVICE_CONFIG.defaultDelay]);
  const [session, setSession] = useState<MixSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addDestination = useCallback(() => {
    setDestinations((prev) => {
      if (prev.length >= SERVICE_CONFIG.maxDestinations) return prev;
      const withNew: DestinationAddress[] = [
        ...prev,
        { id: Date.now().toString(), address: "", percentage: 0 },
      ];
      return distributePercentages(withNew);
    });
  }, []);

  const removeDestination = useCallback((id: string) => {
    setDestinations((prev) => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter((d) => d.id !== id);
      return distributePercentages(filtered);
    });
  }, []);

  const updateAddress = useCallback((id: string, address: string) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, address: address.trim() } : d))
    );
  }, []);

  const updatePercentage = useCallback((id: string, percentage: number) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, percentage } : d))
    );
  }, []);

  const allAddressesValid = useMemo(
    () => destinations.every((d) => d.address && isValidBitcoinAddress(d.address)),
    [destinations]
  );

  const totalPercentage = useMemo(
    () => destinations.reduce((sum, d) => sum + d.percentage, 0),
    [destinations]
  );

  const canProceed = allAddressesValid && totalPercentage === 100;

  const handleConfirm = useCallback(async () => {
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

  const handleNewOperation = useCallback(() => {
    setStep("configure");
    setDestinations([{ id: "1", address: "", percentage: 100 }]);
    setDelay([SERVICE_CONFIG.defaultDelay]);
    setSession(null);
    setError(null);
  }, []);

  return {
    step,
    setStep,
    destinations,
    delay,
    setDelay,
    session,
    loading,
    error,
    setError,
    addDestination,
    removeDestination,
    updateAddress,
    updatePercentage,
    allAddressesValid,
    totalPercentage,
    canProceed,
    handleConfirm,
    handleNewOperation,
  };
}
