import { Suspense, type ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { DefaultPageSkeleton } from "@/components/skeletons/DefaultPageSkeleton";

interface RouteSuspenseProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Per-route Suspense wrapper with integrated ErrorBoundary.
 * Handles lazy-import chunk errors with a retry button.
 */
export function RouteSuspense({
  children,
  fallback = <DefaultPageSkeleton />,
}: RouteSuspenseProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}
