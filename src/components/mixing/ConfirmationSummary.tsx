import { Button } from "@/components/ui/button";
import { Clock, Loader2 } from "lucide-react";
import type { DestinationAddress } from "./DestinationList";

interface ConfirmationSummaryProps {
  destinations: DestinationAddress[];
  delay: number;
  onBack: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmationSummary({
  destinations,
  delay,
  onBack,
  onConfirm,
  loading = false,
}: ConfirmationSummaryProps) {
  return (
    <div className="space-y-8 animate-fade-up">
      <div className="glass-card p-6 md:p-8">
        <h2 className="font-heading font-semibold text-lg mb-6">
          Operation Summary
        </h2>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Destination addresses
            </p>
            {destinations.map((dest) => (
              <div
                key={dest.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 mb-2"
              >
                <span className="font-mono text-sm truncate max-w-[60%]">
                  {dest.address}
                </span>
                <span className="text-primary font-semibold">
                  {dest.percentage}%
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Configured delay</span>
            </div>
            <span className="font-semibold">
              {delay} {delay === 1 ? "hour" : "hours"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={onBack}
          disabled={loading}
        >
          Back
        </Button>
        <Button
          variant="hero"
          size="lg"
          className="flex-1"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating session...
            </>
          ) : (
            "Confirm and Generate Address"
          )}
        </Button>
      </div>
    </div>
  );
}
