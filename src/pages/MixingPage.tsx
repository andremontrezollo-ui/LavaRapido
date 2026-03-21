import { useState, useCallback, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus } from "lucide-react";
import { ProgressSteps, type MixingStep } from "@/components/mixing/ProgressSteps";
import { DestinationList } from "@/components/mixing/DestinationList";
import { DelayConfiguration } from "@/components/mixing/DelayConfiguration";
import { ConfirmationSummary } from "@/components/mixing/ConfirmationSummary";
import { DepositInfo } from "@/components/mixing/DepositInfo";
import { SERVICE_CONFIG } from "@/lib/constants";
import {
  initialState,
  deriveValidation,
  applyAddDestination,
  applyRemoveDestination,
  applyUpdateAddress,
  applyUpdatePercentage,
  applySessionResult,
} from "@/features/mixing/application/index";
import { submitMixSession } from "@/features/mixing/infrastructure/index";

export default function MixingPage() {
  const [state, setState] = useState(initialState);

  const { canProceed, total: totalPercentage } = useMemo(
    () => deriveValidation(state),
    [state]
  );

  const addDestination = useCallback(() => {
    setState((s) => applyAddDestination(s));
  }, []);

  const removeDestination = useCallback((id: string) => {
    setState((s) => applyRemoveDestination(s, id));
  }, []);

  const updateAddress = useCallback((id: string, address: string) => {
    setState((s) => applyUpdateAddress(s, id, address));
  }, []);

  const updatePercentage = useCallback((id: string, percentage: number) => {
    setState((s) => applyUpdatePercentage(s, id, percentage));
  }, []);

  const handleConfirm = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const result = await submitMixSession();
    setState((s) => applySessionResult(s, result));
  }, []);

  const handleNewOperation = useCallback(() => {
    setState(initialState());
  }, []);

  const { step, destinations, delay, session, loading, error } = state;

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
            <ProgressSteps currentStep={step as MixingStep} />

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
                <DelayConfiguration
                  delay={[delay]}
                  onDelayChange={(v) =>
                    setState((s) => ({ ...s, delay: v[0] }))
                  }
                />

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
                  onClick={() => setState((s) => ({ ...s, step: "confirm" }))}
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setState((s) => ({ ...s, error: null }))}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}
                <ConfirmationSummary
                  destinations={destinations}
                  delay={delay}
                  onBack={() =>
                    setState((s) => ({ ...s, step: "configure", error: null }))
                  }
                  onConfirm={handleConfirm}
                  loading={loading}
                />
              </div>
            )}

            {/* Step: Deposit */}
            {step === "deposit" && session && (
              <DepositInfo session={session} onNewOperation={handleNewOperation} />
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
