export default function AdminLoading() {
  return (
    <div className="relative space-y-10 lg:space-y-12">
      {/* Hardware-accelerated Brand Sweep Loader */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-primary shimmer-glow" />

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-36 rounded-md shimmer-glow" />
          <div className="h-4 w-52 rounded shimmer-glow" />
        </div>
        <div className="h-9 w-28 rounded-lg shimmer-glow" />
      </div>

      {/* Primary KPI Blocks */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded shimmer-glow" />
              <div className="h-7 w-7 rounded-lg shimmer-glow" />
            </div>
            <div className="h-7 w-32 rounded-md shimmer-glow mt-1" />
            <div className="h-3.5 w-40 rounded shimmer-glow" />
          </div>
        ))}
      </div>

      {/* Analytics Charts Mock Blocks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mock Chart Card 1: Revenue Trend */}
        <div className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/20 pb-3">
            <div className="space-y-1.5">
              <div className="h-4.5 w-32 rounded shimmer-glow" />
              <div className="h-3 w-48 rounded shimmer-glow" />
            </div>
            <div className="h-6 w-20 rounded-md shimmer-glow" />
          </div>
          <div className="h-56 flex items-end justify-between gap-4 pt-4 px-2">
            {[45, 75, 55, 95, 65, 85, 70, 90, 60, 80, 50, 85].map((h, j) => (
              <div
                key={j}
                style={{ height: `${h}%` }}
                className="w-full rounded-t-sm shimmer-glow opacity-80"
              />
            ))}
          </div>
        </div>

        {/* Mock Chart Card 2: Donut Split */}
        <div className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/20 pb-3">
            <div className="space-y-1.5">
              <div className="h-4.5 w-36 rounded shimmer-glow" />
              <div className="h-3 w-40 rounded shimmer-glow" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center h-56 pt-2">
            {/* Mock Ring */}
            <div className="col-span-7 flex justify-center items-center relative">
              <div className="h-40 w-40 rounded-full border-[14px] border-[var(--shell-surface-alt)] flex items-center justify-center">
                <div className="flex flex-col items-center justify-center rounded-full h-24 w-24 border shadow-sm">
                  <div className="h-6 w-10 rounded shimmer-glow" />
                  <div className="h-3 w-12 rounded shimmer-glow mt-1.5" />
                </div>
              </div>
            </div>
            {/* Mock Legend */}
            <div className="col-span-5 space-y-3.5 pr-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shimmer-glow" />
                      <div className="h-3.5 w-16 rounded shimmer-glow" />
                    </div>
                    <div className="h-3.5 w-8 rounded shimmer-glow" />
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabular Lists Mock Layout */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border/20 pb-2">
          <div className="h-4 w-20 rounded shimmer-glow" />
          <div className="h-px flex-1 bg-border/20" />
        </div>
        <div className="rounded-xl border overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 border-b border-border bg-secondary/50 px-6 py-3">
            <div className="col-span-2"><div className="h-3.5 w-12 rounded shimmer-glow" /></div>
            <div className="col-span-4"><div className="h-3.5 w-24 rounded shimmer-glow" /></div>
            <div className="col-span-2"><div className="h-3.5 w-16 rounded shimmer-glow" /></div>
            <div className="col-span-2"><div className="h-3.5 w-16 rounded shimmer-glow" /></div>
            <div className="col-span-2 text-right flex justify-end"><div className="h-3.5 w-8 rounded shimmer-glow" /></div>
          </div>
          {/* Table Rows */}
          <div className="divide-y divide-border/40">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                <div className="col-span-2"><div className="h-4 w-16 rounded shimmer-glow" /></div>
                <div className="col-span-4"><div className="h-4 w-40 rounded shimmer-glow" /></div>
                <div className="col-span-2"><div className="h-4 w-20 rounded shimmer-glow" /></div>
                <div className="col-span-2"><div className="h-5 w-14 rounded-full shimmer-glow" /></div>
                <div className="col-span-2 flex justify-end"><div className="h-6 w-6 rounded-md shimmer-glow" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
