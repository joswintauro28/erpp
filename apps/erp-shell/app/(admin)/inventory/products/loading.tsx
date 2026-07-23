export default function ProductsLoading() {
  return (
    <div className="relative space-y-8 animate-pulse">
      {/* Brand Sweep Loader */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-36 rounded-md shimmer-glow" />
          <div className="h-4 w-60 rounded shimmer-glow" />
        </div>
        <div className="h-9 w-28 rounded-lg shimmer-glow" />
      </div>

      {/* KPI Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-32 rounded shimmer-glow" />
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 rounded shimmer-glow" />
                <div className="h-7 w-7 rounded-lg shimmer-glow" />
              </div>
              <div className="h-7 w-16 rounded-md shimmer-glow mt-1" />
              <div className="h-3.5 w-28 rounded shimmer-glow" />
            </div>
          ))}
        </div>
      </div>

      {/* Registry Section */}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-32 rounded shimmer-glow" />
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="h-9 w-full max-w-xs rounded-lg shimmer-glow" />
          <div className="h-9 w-36 rounded-lg shimmer-glow" />
        </div>

        {/* Table representation */}
        <div className="overflow-hidden rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <div className="border-b border-[var(--shell-border)] bg-[var(--shell-surface)] px-4 py-3">
            <div className="flex items-center gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-3.5 rounded shimmer-glow"
                  style={{ width: `${[15, 12, 12, 10, 10, 10, 10, 10][i]}%` }}
                />
              ))}
            </div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-[var(--shell-border)] px-4 py-3.5 last:border-0"
            >
              {Array.from({ length: 8 }).map((_, j) => (
                <div
                  key={j}
                  className="h-4 rounded shimmer-glow"
                  style={{ width: `${[15, 12, 12, 10, 10, 10, 10, 10][j]}%` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
