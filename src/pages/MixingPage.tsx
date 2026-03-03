import { useState, useCallback, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus, Loader2 } from "lucide-react";
import { ProgressSteps, type MixingStep } from "@/components/mixing/ProgressSteps";
import { DestinationList, type DestinationAddress } from "@/components/mixing/DestinationList";
import { DelayConfiguration } from "@/components/mixing/DelayConfiguration";
import { ConfirmationSummary } from "@/components/mixing/ConfirmationSummary";
import { DepositInfo } from "@/components/mixing/DepositInfo";
import { SERVICE_CONFIG } from "@/lib/constants";
import { isValidBitcoinAddress } from "@/lib/validation";
import { createMixSession, type MixSessionResponse } from "@/lib/api";
import type { MixSession } from "@/lib/mock-session";

export default function MixingPage() {
  const [step, setStep] = useState<MixingStep>("configure");
  const [destinations, setDestinations] = useState<DestinationAddress[]>([
    { id: "1", address: "", percentage: 100 },
  ]);
  const [delay, setDelay] = useState<number[]>([SERVICE_CONFIG.defaultDelay]);
  const [session, setSession] = useState<MixSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addDestination = useCallback(() => {
    if (destinations.length >= SERVICE_CONFIG.maxDestinations) return;
    
    const newPercentage = Math.floor(100 / (destinations.length + 1));
    const updatedDestinations = destinations.map((d) => ({
      ...d,
      percentage: newPercentage,
    }));
    updatedDestinations.push({
      id: Date.now().toString(),
      address: "",
      percentage: 100 - newPercentage * destinations.length,
    });
    setDestinations(updatedDestinations);
  }, [destinations]);

  const removeDestination = useCallback((id: string) => {
    if (destinations.length <= 1) return;
    
    const filtered = destinations.filter((d) => d.id !== id);
    const perAddress = Math.floor(100 / filtered.length);
    const remainder = 100 - perAddress * (filtered.length - 1);
    setDestinations(
      filtered.map((d, i) => ({
        ...d,
        percentage: i === filtered.length - 1 ? remainder : perAddress,
      }))
    );
  }, [destinations]);

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

  const allAddressesValid = useMemo(() => 
    destinations.every((d) => d.address && isValidBitcoinAddress(d.address)),
    [destinations]
  );

  const totalPercentage = useMemo(() => 
    destinations.reduce((sum, d) => sum + d.percentage, 0),
    [destinations]
  );

  const canProceed = allAddressesValid && totalPercentage === 100;

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await createMixSession();

    if (result.error) {
      setError(result.status === 429 
        ? "Too many requests. Please wait a few minutes." 
        : result.error);
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

  return (
    <Layout>
      <section className="pt-32 pb-20 min-h-screen relative">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-radial from-primary/5 via-transparent to-transparent" />

        <div className="container relative mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                Configure <span className="gradient-text">Mixing</span>
              </h1>
              <p className="text-muted-foreground">
                Configure the parameters for your mixing operation
              </p>
            </div>

            {/* Progress Steps */}
            <ProgressSteps currentStep={step} />

            {/* Step: Configure */}
            {step === "configure" && (
              <div className="space-y-8 animate-fade-up">
                {/* Destination Addresses */}
                <div className="glass-card p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-heading font-semibold text-lg mb-1">
                        Destination Addresses
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Where you want to receive funds after mixing
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addDestination}
                      disabled={destinations.length >= SERVICE_CONFIG.maxDestinations}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <DestinationList
                    destinations={destinations}
                    onUpdateAddress={updateAddress}
                    onUpdatePercentage={updatePercentage}
                    onRemove={removeDestination}
                  />

                  {totalPercentage !== 100 && (
                    <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                      <span className="text-sm text-warning">
                        Total must be 100%. Current: {totalPercentage}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Delay Configuration */}
                <DelayConfiguration delay={delay} onDelayChange={setDelay} />

                {/* Warning */}
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning mb-1">
                      Warning: Irreversible Operation
                    </p>
                    <p className="text-sm text-muted-foreground">
                      After confirming and sending funds, the operation cannot be
                      canceled or reversed. Check all addresses carefully.
                    </p>
                  </div>
                </div>

                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={() => setStep("confirm")}
                  disabled={!canProceed}
                >
                  Review Configuration
                </Button>
              </div>
            )}

            {/* Step: Confirm */}
            {step === "confirm" && (
              <div className="space-y-4">
                {error && (
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive mb-1">Error</p>
                      <p className="text-sm text-muted-foreground">{error}</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}
                <ConfirmationSummary
                  destinations={destinations}
                  delay={delay[0]}
                  onBack={() => { setStep("configure"); setError(null); }}
                  onConfirm={handleConfirm}
                  loading={loading}
                />
              </div>
            )}

            {/* Step: Deposit */}
            {step === "deposit" && session && (
              <DepositInfo
                session={session}
                onNewOperation={handleNewOperation}
              />
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
