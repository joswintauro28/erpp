export default function WarehousesLoading() {
  return (
    <div className="relative space-y-6 animate-pulse">
      {/* Brand Sweep Loader */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-32 rounded-md shimmer-glow" />
          <div className="h-4 w-48 rounded shimmer-glow" />
        </div>
        <div className="h-9 w-32 rounded-lg shimmer-glow" />
      </div>

      {/* Search Input Bar */}
      <div className="h-9 w-full max-w-xs rounded-lg shimmer-glow" />

      {/* 2-column Card Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 shadow-sm space-y-3.5"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded shimmer-glow" />
                  <div className="h-4 w-44 rounded shimmer-glow" />
                </div>
                <div className="h-3 w-16 rounded shimmer-glow" />
                <div className="h-3 w-56 rounded shimmer-glow" />
              </div>
              <div className="h-5 w-12 rounded-full shimmer-glow" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
