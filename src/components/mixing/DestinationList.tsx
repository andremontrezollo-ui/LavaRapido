import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidBitcoinAddress } from "@/lib/validation";

export interface DestinationAddress {
  id: string;
  address: string;
  percentage: number;
}

interface DestinationListProps {
  destinations: DestinationAddress[];
  onUpdateAddress: (id: string, address: string) => void;
  onUpdatePercentage: (id: string, percentage: number) => void;
  onRemove: (id: string) => void;
}

export function DestinationList({
  destinations,
  onUpdateAddress,
  onUpdatePercentage,
  onRemove,
}: DestinationListProps) {
  return (
    <div className="space-y-4" role="list" aria-label="Destination addresses">
      {destinations.map((dest, index) => {
        const inputId = `dest-address-${dest.id}`;
        const errorId = `dest-address-error-${dest.id}`;
        const sliderId = `dest-pct-${dest.id}`;
        const hasAddress = dest.address.length > 0;
        const isValid = hasAddress && isValidBitcoinAddress(dest.address);
        const isInvalid = hasAddress && !isValid;

        return (
          <div
            key={dest.id}
            role="listitem"
            className="p-4 rounded-xl bg-secondary/50 border border-border/50"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-4">
                <div>
                  <Label
                    htmlFor={inputId}
                    className="text-sm text-muted-foreground mb-2 block"
                  >
                    Bitcoin Address #{index + 1}
                  </Label>
                  <Input
                    id={inputId}
                    placeholder="bc1q… or 3… or 1…"
                    value={dest.address}
                    onChange={(e) => onUpdateAddress(dest.id, e.target.value)}
                    className={cn(
                      "font-mono text-sm",
                      isInvalid
                        ? "border-destructive focus-visible:ring-destructive"
                        : isValid
                        ? "border-success focus-visible:ring-success"
                        : ""
                    )}
                    maxLength={62}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={isInvalid || undefined}
                    aria-describedby={isInvalid ? errorId : undefined}
                  />
                  {isInvalid && (
                    <p id={errorId} role="alert" className="text-xs text-destructive mt-1">
                      Invalid Bitcoin address format
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor={sliderId}
                    className="text-sm text-muted-foreground mb-2 block"
                  >
                    Percentage: {dest.percentage}%
                  </Label>
                  <Slider
                    id={sliderId}
                    value={[dest.percentage]}
                    onValueChange={(value) => onUpdatePercentage(dest.id, value[0])}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                    aria-label={`Percentage for destination ${index + 1}`}
                    aria-valuetext={`${dest.percentage}%`}
                  />
                </div>
              </div>
              {destinations.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(dest.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove destination ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
