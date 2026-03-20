import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Info } from "lucide-react";
import { SERVICE_CONFIG } from "@/lib/constants";

interface DelayConfigurationProps {
  delay: number[];
  onDelayChange: (value: number[]) => void;
}

export function DelayConfiguration({ delay, onDelayChange }: DelayConfigurationProps) {
  const delayHours = delay[0];
  const delayLabel = `${delayHours} ${delayHours === 1 ? "hour" : "hours"}`;

  return (
    <div className="glass-card p-6 md:p-8">
      <div className="mb-6">
        <h2 className="font-heading font-semibold text-lg mb-1">
          Processing Delay
        </h2>
        <p className="text-sm text-muted-foreground" id="delay-description">
          Wait time between deposit confirmation and outputs
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="delay-slider" className="text-muted-foreground">
            Minimum delay
          </Label>
          <span className="font-heading font-semibold text-primary" aria-live="polite">
            {delayLabel}
          </span>
        </div>
        <Slider
          id="delay-slider"
          value={delay}
          onValueChange={onDelayChange}
          min={SERVICE_CONFIG.minDelay}
          max={SERVICE_CONFIG.maxDelay}
          step={1}
          className="w-full"
          aria-label="Processing delay"
          aria-describedby="delay-description"
          aria-valuetext={delayLabel}
        />
        <div className="flex justify-between text-xs text-muted-foreground" aria-hidden="true">
          <span>Immediate</span>
          <span>24 hours</span>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-2">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">
          Longer delays increase privacy but delay receipt.
          We recommend at least {SERVICE_CONFIG.defaultDelay} hours.
        </span>
      </div>
    </div>
  );
}
