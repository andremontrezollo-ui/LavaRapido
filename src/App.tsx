import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy } from "react";

import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { RouteSuspense } from "@/components/system/RouteSuspense";
import { HomeSkeleton } from "@/components/skeletons/HomeSkeleton";
import { MixingSkeleton } from "@/components/skeletons/MixingSkeleton";
import { ContactSkeleton } from "@/components/skeletons/ContactSkeleton";
import { DefaultPageSkeleton } from "@/components/skeletons/DefaultPageSkeleton";

// Eager load critical pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load non-critical pages for better performance
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const MixingPage = lazy(() => import("./pages/MixingPage"));
const Fees = lazy(() => import("./pages/Fees"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Global error boundary catches errors outside of route-level boundaries */}
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Index />} />

            <Route
              path="/how-it-works"
              element={
                <RouteSuspense fallback={<DefaultPageSkeleton />}>
                  <HowItWorks />
                </RouteSuspense>
              }
            />

            <Route
              path="/mixing"
              element={
                <RouteSuspense fallback={<MixingSkeleton />}>
                  <MixingPage />
                </RouteSuspense>
              }
            />

            <Route
              path="/fees"
              element={
                <RouteSuspense fallback={<DefaultPageSkeleton />}>
                  <Fees />
                </RouteSuspense>
              }
            />

            <Route
              path="/faq"
              element={
                <RouteSuspense fallback={<DefaultPageSkeleton />}>
                  <FAQ />
                </RouteSuspense>
              }
            />

            <Route
              path="/contact"
              element={
                <RouteSuspense fallback={<ContactSkeleton />}>
                  <Contact />
                </RouteSuspense>
              }
            />

            <Route
              path="/terms"
              element={
                <RouteSuspense fallback={<DefaultPageSkeleton />}>
                  <Terms />
                </RouteSuspense>
              }
            />

            <Route
              path="/privacy"
              element={
                <RouteSuspense fallback={<DefaultPageSkeleton />}>
                  <Privacy />
                </RouteSuspense>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
