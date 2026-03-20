import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus } from "lucide-react";
import { ProgressSteps } from "@/components/mixing/ProgressSteps";
import { DestinationList } from "@/components/mixing/DestinationList";
import { DelayConfiguration } from "@/components/mixing/DelayConfiguration";
import { ConfirmationSummary } from "@/components/mixing/ConfirmationSummary";
import { DepositInfo } from "@/components/mixing/DepositInfo";
import { SERVICE_CONFIG } from "@/lib/constants";
import { useMixingFlow } from "@/features/mixing/hooks/useMixingFlow";

export default function MixingPage() {
  const flow = useMixingFlow();

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
            <ProgressSteps currentStep={flow.step} />

            {/* Step: Configure */}
            {flow.step === "configure" && (
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
                      onClick={flow.addDestination}
                      disabled={flow.destinations.length >= SERVICE_CONFIG.maxDestinations}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <DestinationList
                    destinations={flow.destinations}
                    onUpdateAddress={flow.updateAddress}
                    onUpdatePercentage={flow.updatePercentage}
                    onRemove={flow.removeDestination}
                  />

                  {flow.totalPercentage !== 100 && (
                    <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                      <span className="text-sm text-warning">
                        Total must be 100%. Current: {flow.totalPercentage}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Delay Configuration */}
                <DelayConfiguration delay={flow.delay} onDelayChange={flow.setDelay} />

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
                  onClick={flow.goToConfirm}
                  disabled={!flow.canProceed}
                >
                  Review Configuration
                </Button>
              </div>
            )}

            {/* Step: Confirm */}
            {flow.step === "confirm" && (
              <div className="space-y-4">
                {flow.error && (
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive mb-1">Error</p>
                      <p className="text-sm text-muted-foreground">{flow.error}</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={flow.goToConfigure}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}
                <ConfirmationSummary
                  destinations={flow.destinations}
                  delay={flow.delay[0]}
                  onBack={flow.goToConfigure}
                  onConfirm={flow.confirmMix}
                  loading={flow.loading}
                />
              </div>
            )}

            {/* Step: Deposit */}
            {flow.step === "deposit" && flow.session && (
              <DepositInfo
                session={flow.session}
                onNewOperation={flow.resetFlow}
              />
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
