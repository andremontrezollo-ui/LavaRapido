const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-secondary/60 ${className ?? ""}`} />
);

export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading page…">
      {/* Hero */}
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Shimmer className="h-16 w-3/4 mx-auto" />
            <Shimmer className="h-16 w-2/3 mx-auto" />
            <Shimmer className="h-6 w-96 mx-auto" />
            <Shimmer className="h-12 w-44 mx-auto rounded-full" />
          </div>

          {/* 3-step flow */}
          <div className="max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="text-center space-y-3">
                <Shimmer className="h-14 w-14 rounded-full mx-auto" />
                <Shimmer className="h-5 w-24 mx-auto" />
                <Shimmer className="h-4 w-32 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-6">
            <Shimmer className="h-8 w-56 mx-auto" />
            <Shimmer className="h-5 w-80 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-6 space-y-3">
                  <Shimmer className="h-10 w-10 rounded-lg" />
                  <Shimmer className="h-5 w-32" />
                  <Shimmer className="h-4 w-full" />
                  <Shimmer className="h-4 w-4/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="text-center space-y-2">
                <Shimmer className="h-8 w-24 mx-auto" />
                <Shimmer className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
