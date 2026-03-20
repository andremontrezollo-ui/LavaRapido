import { useNavigate } from "react-router-dom";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  error?: Error | null;
  onReset?: () => void;
}

export function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const navigate = useNavigate();

  const isChunkError =
    error?.message?.includes("Failed to fetch dynamically imported module") ||
    error?.message?.includes("Loading chunk") ||
    error?.name === "ChunkLoadError";

  return (
    <div
      role="alert"
      className="min-h-[60vh] flex items-center justify-center p-8"
    >
      <div className="glass-card max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h2 className="font-heading font-semibold text-xl">
            {isChunkError ? "Failed to load page" : "Something went wrong"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isChunkError
              ? "The page could not be loaded. This may be a network issue. Please try again."
              : error?.message || "An unexpected error occurred. Please try again."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onReset && (
            <Button variant="hero" onClick={onReset} className="gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
            <Home className="h-4 w-4" aria-hidden="true" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
