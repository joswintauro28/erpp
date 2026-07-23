export default function StockMovementsLoading() {
  return (
    <div className="relative space-y-6 animate-pulse">
      {/* Brand Sweep Loader */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      {/* Header */}
      <div className="space-y-2">
        <div className="h-6 w-40 rounded-md shimmer-glow" />
        <div className="h-4 w-72 rounded shimmer-glow" />
      </div>

      {/* Filter Options and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 w-full max-w-xs rounded-lg shimmer-glow" />
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-16 rounded-lg shimmer-glow" />
          ))}
        </div>
        <div className="h-8 w-24 rounded-lg shimmer-glow" />
      </div>

      {/* Table Card container */}
      <div className="overflow-hidden rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]">
        <div className="border-b border-[var(--shell-border)] bg-[var(--shell-surface)] px-4 py-3">
          <div className="flex items-center gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-3.5 rounded shimmer-glow"
                style={{ width: `${[16, 12, 14, 14, 10, 34][i]}%` }}
              />
            ))}
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[var(--shell-border)] px-4 py-3.5 last:border-0"
          >
            {Array.from({ length: 6 }).map((_, j) => (
              <div
                key={j}
                className="h-4 rounded shimmer-glow"
                style={{ width: `${[16, 12, 14, 14, 10, 34][j]}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
