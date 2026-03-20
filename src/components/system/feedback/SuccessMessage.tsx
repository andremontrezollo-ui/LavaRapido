import { forwardRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessMessageProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Success message banner with aria-live="polite" so screen readers announce it.
 * Accept a ref so callers can programmatically focus it after a successful action.
 */
export const SuccessMessage = forwardRef<HTMLDivElement, SuccessMessageProps>(
  ({ title, description, className, children }, ref) => (
    <div
      ref={ref}
      aria-live="polite"
      tabIndex={-1}
      className={cn(
        "p-4 rounded-xl bg-success/10 border border-success/20 flex items-start gap-3 outline-none",
        className
      )}
    >
      <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-success">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
        {children}
      </div>
    </div>
  )
);

SuccessMessage.displayName = "SuccessMessage";
