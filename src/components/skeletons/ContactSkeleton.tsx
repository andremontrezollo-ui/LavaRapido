const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-secondary/60 ${className ?? ""}`} />
);

export function ContactSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading page…">
      {/* Hero */}
      <section className="pt-32 pb-16">
        <div className="container mx-auto px-4 text-center space-y-4">
          <Shimmer className="h-12 w-40 mx-auto" />
          <Shimmer className="h-5 w-72 mx-auto" />
        </div>
      </section>

      {/* Form + Info */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form card */}
            <div className="glass-card p-8 space-y-6">
              <Shimmer className="h-6 w-36" />

              {/* Subject field */}
              <div className="space-y-2">
                <Shimmer className="h-4 w-16" />
                <Shimmer className="h-10 w-full" />
              </div>

              {/* Message field */}
              <div className="space-y-2">
                <Shimmer className="h-4 w-20" />
                <Shimmer className="h-36 w-full" />
              </div>

              {/* Reply contact */}
              <div className="space-y-2">
                <Shimmer className="h-4 w-40" />
                <Shimmer className="h-10 w-full" />
              </div>

              {/* Submit button */}
              <Shimmer className="h-12 w-full rounded-lg" />
            </div>

            {/* Info cards */}
            <div className="space-y-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <Shimmer className="h-10 w-10 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Shimmer className="h-5 w-28" />
                      <Shimmer className="h-4 w-full" />
                      <Shimmer className="h-4 w-4/5" />
                    </div>
                  </div>
                </div>
              ))}

              {/* PGP card */}
              <div className="glass-card p-6 space-y-3">
                <Shimmer className="h-5 w-32" />
                <Shimmer className="h-24 w-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
