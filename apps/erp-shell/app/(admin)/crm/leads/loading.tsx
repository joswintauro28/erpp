export default function LeadsLoading() {
  return (
    <div className="relative space-y-10 lg:space-y-12">
      {/* Brand progress sweep bar */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--shell-brand] shimmer-glow" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-24 rounded-md shimmer-glow" />
          <div className="h-4 w-64 rounded shimmer-glow" />
        </div>
        <div className="h-9 w-24 rounded-lg shimmer-glow" />
      </div>

      {/* Pipeline Analytics KPIs */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-28 rounded shimmer-glow" />
          <div className="h-px flex-1 bg-[--shell-border]/20" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-[--shell-border] bg-[--shell-surface] p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 rounded shimmer-glow" />
                <div className="h-7 w-7 rounded-lg shimmer-glow" />
              </div>
              <div className="h-7 w-12 rounded-md shimmer-glow mt-1" />
              <div className="h-3.5 w-24 rounded shimmer-glow" />
            </div>
          ))}
        </div>
      </section>

      {/* Registry & Filters Bar */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-28 rounded shimmer-glow" />
          <div className="h-px flex-1 bg-[--shell-border]/20" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-9 w-64 rounded-lg border border-[--shell-border] bg-[--shell-surface] shimmer-glow" />
          <div className="h-9 w-36 rounded-lg border border-[--shell-border] bg-[--shell-surface] shimmer-glow" />
        </div>
      </section>

      {/* Table Mock Layout */}
      <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 border-b border-[--shell-border] bg-[--shell-surface-alt]/50 px-6 py-3">
          <div className="col-span-3"><div className="h-3.5 w-16 rounded shimmer-glow" /></div>
          <div className="col-span-2"><div className="h-3.5 w-14 rounded shimmer-glow" /></div>
          <div className="col-span-2"><div className="h-3.5 w-14 rounded shimmer-glow" /></div>
          <div className="col-span-2"><div className="h-3.5 w-16 rounded shimmer-glow" /></div>
          <div className="col-span-2"><div className="h-3.5 w-12 rounded shimmer-glow" /></div>
          <div className="col-span-1 text-right flex justify-end"><div className="h-3.5 w-8 rounded shimmer-glow" /></div>
        </div>
        {/* Table Rows */}
        <div className="divide-y divide-[--shell-border]/40">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
              <div className="col-span-3"><div className="h-4 w-32 rounded shimmer-glow" /></div>
              <div className="col-span-2"><div className="h-4 w-20 rounded shimmer-glow" /></div>
              <div className="col-span-2"><div className="h-4 w-12 rounded shimmer-glow" /></div>
              <div className="col-span-2"><div className="h-4 w-14 rounded shimmer-glow" /></div>
              <div className="col-span-2"><div className="h-5 w-16 rounded-full shimmer-glow" /></div>
              <div className="col-span-1 flex justify-end"><div className="h-6 w-6 rounded-md shimmer-glow" /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
