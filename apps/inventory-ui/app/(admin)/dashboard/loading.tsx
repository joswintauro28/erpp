export default function DashboardLoading() {
  return (
    <div className="relative space-y-10 lg:space-y-12">
      {/* Brand progress sweep bar */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-36 rounded-md shimmer-glow" />
          <div className="h-4 w-52 rounded shimmer-glow" />
        </div>
      </div>

      {/* Primary KPI Blocks */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 shadow-engineered"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded shimmer-glow" />
              <div className="h-7 w-7 rounded-lg shimmer-glow" />
            </div>
            <div className="h-7 w-24 rounded-md shimmer-glow mt-1" />
            <div className="h-3.5 w-32 rounded shimmer-glow" />
          </div>
        ))}
      </div>

      {/* Analytics & Operations Mock Blocks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mock Operations Card 1 */}
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--shell-border)]/20 pb-3">
            <div className="space-y-1.5">
              <div className="h-4.5 w-32 rounded shimmer-glow" />
              <div className="h-3 w-48 rounded shimmer-glow" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-2 border-b border-[var(--shell-border)]/10">
                <div className="h-4 w-32 rounded shimmer-glow" />
                <div className="h-4 w-16 rounded shimmer-glow" />
                <div className="h-4 w-20 rounded shimmer-glow" />
              </div>
            ))}
          </div>
        </div>

        {/* Mock Operations Card 2 */}
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--shell-border)]/20 pb-3">
            <div className="space-y-1.5">
              <div className="h-4.5 w-36 rounded shimmer-glow" />
              <div className="h-3 w-40 rounded shimmer-glow" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-2 border-b border-[var(--shell-border)]/10">
                <div className="h-4 w-36 rounded shimmer-glow" />
                <div className="h-4 w-16 rounded shimmer-glow" />
                <div className="h-4 w-20 rounded shimmer-glow" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
