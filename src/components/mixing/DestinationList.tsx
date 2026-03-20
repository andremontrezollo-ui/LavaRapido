import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidBitcoinAddress } from "@/lib/validation";
import type { Destination } from "@/features/mixing/types/mixing.types";

/** @deprecated Use Destination from @/features/mixing/types/mixing.types */
export type DestinationAddress = Destination;

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
    <div className="space-y-4">
      {destinations.map((dest, index) => (
        <div
          key={dest.id}
          className="p-4 rounded-xl bg-secondary/50 border border-border/50"
        >
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Bitcoin Address #{index + 1}
                </Label>
                <Input
                  placeholder="bc1q... or 3... or 1..."
                  value={dest.address}
                  onChange={(e) => onUpdateAddress(dest.id, e.target.value)}
                  className={cn(
                    "font-mono text-sm",
                    dest.address && !isValidBitcoinAddress(dest.address)
                      ? "border-destructive focus-visible:ring-destructive"
                      : dest.address && isValidBitcoinAddress(dest.address)
                      ? "border-success focus-visible:ring-success"
                      : ""
                  )}
                  maxLength={62}
                  autoComplete="off"
                  spellCheck={false}
                />
                {dest.address && !isValidBitcoinAddress(dest.address) && (
                  <p className="text-xs text-destructive mt-1">
                    Invalid Bitcoin address format
                  </p>
                )}
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Percentage: {dest.percentage}%
                </Label>
                <Slider
                  value={[dest.percentage]}
                  onValueChange={(value) => onUpdatePercentage(dest.id, value[0])}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
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
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
