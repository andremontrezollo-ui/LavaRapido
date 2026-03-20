import { forwardRef } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
  id?: string;
}

/**
 * Inline error block with optional retry action.
 * Uses role="alert" so screen readers announce it immediately.
 * Accepts a ref for programmatic focus after async errors.
 */
export const InlineError = forwardRef<HTMLDivElement, InlineErrorProps>(
  ({ message, onRetry, className, id }, ref) => (
    <div
      ref={ref}
      id={id}
      role="alert"
      tabIndex={-1}
      className={cn(
        "p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 outline-none",
        className
      )}
    >
      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-destructive">{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2 gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </Button>
        )}
      </div>
    </div>
  )
);

InlineError.displayName = "InlineError";
