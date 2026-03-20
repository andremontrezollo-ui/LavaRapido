const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-secondary/60 ${className ?? ""}`} />
);

export function DefaultPageSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading page…">
      {/* Hero */}
      <section className="pt-32 pb-16">
        <div className="container mx-auto px-4 text-center space-y-4">
          <Shimmer className="h-10 w-48 mx-auto" />
          <Shimmer className="h-5 w-80 mx-auto" />
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl space-y-6">
          <Shimmer className="h-6 w-56" />
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-5/6" />
          <Shimmer className="h-4 w-4/5" />

          <div className="pt-4 space-y-4">
            <Shimmer className="h-6 w-40" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-3/4" />
          </div>

          <div className="pt-4 space-y-4">
            <Shimmer className="h-6 w-44" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-5/6" />
          </div>
        </div>
      </section>
    </div>
  );
}
