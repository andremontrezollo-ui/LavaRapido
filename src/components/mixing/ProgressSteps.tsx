import { Wallet, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MixingStep } from "@/features/mixing/types/mixing.types";

export type { MixingStep };

interface ProgressStepsProps {
  currentStep: MixingStep;
}

const steps = [
  { key: "configure" as const, label: "Configure", icon: Wallet },
  { key: "confirm" as const, label: "Confirm", icon: CheckCircle2 },
  { key: "deposit" as const, label: "Deposit", icon: Clock },
];

export function ProgressSteps({ currentStep }: ProgressStepsProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-4 mb-12">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center gap-4">
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              currentStep === step.key
                ? "bg-primary text-primary-foreground"
                : index < currentIndex
                ? "bg-success/20 text-success"
                : "bg-secondary text-muted-foreground"
            )}
            aria-current={currentStep === step.key ? "step" : undefined}
          >
            <step.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "w-8 h-0.5",
                index < currentIndex ? "bg-success" : "bg-border"
              )}
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  );
}
