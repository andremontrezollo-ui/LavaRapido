import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  className?: string;
}

/**
 * Semi-transparent overlay displayed over a section while loading.
 * Uses aria-live="polite" and role="status" for screen-reader announcements.
 */
export function LoadingOverlay({ show, message = "Loading…", className }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-xl",
        "bg-background/70 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
