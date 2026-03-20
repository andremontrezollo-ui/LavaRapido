const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-secondary/60 ${className ?? ""}`} />
);

export function MixingSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading page…">
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Title */}
            <div className="text-center mb-12 space-y-4">
              <Shimmer className="h-10 w-64 mx-auto" />
              <Shimmer className="h-5 w-72 mx-auto" />
            </div>

            {/* Progress steps */}
            <div className="flex items-center justify-center gap-4 mb-10">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Shimmer className="h-10 w-10 rounded-full" />
                  {i < 2 && <Shimmer className="h-0.5 w-16" />}
                </div>
              ))}
            </div>

            {/* Destination addresses card */}
            <div className="glass-card p-6 md:p-8 mb-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Shimmer className="h-6 w-48" />
                  <Shimmer className="h-4 w-64" />
                </div>
                <Shimmer className="h-9 w-20 rounded-lg" />
              </div>

              {/* Destination item */}
              <div className="p-4 rounded-xl bg-secondary/50 space-y-4">
                <Shimmer className="h-4 w-32" />
                <Shimmer className="h-10 w-full" />
                <Shimmer className="h-4 w-24" />
                <Shimmer className="h-2 w-full rounded-full" />
              </div>
            </div>

            {/* Delay card */}
            <div className="glass-card p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <Shimmer className="h-6 w-40" />
                <Shimmer className="h-4 w-64" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Shimmer className="h-5 w-32" />
                  <Shimmer className="h-5 w-20" />
                </div>
                <Shimmer className="h-2 w-full rounded-full" />
              </div>
            </div>

            {/* CTA */}
            <Shimmer className="h-12 w-full mt-8 rounded-lg" />
          </div>
        </div>
      </section>
    </div>
  );
}
