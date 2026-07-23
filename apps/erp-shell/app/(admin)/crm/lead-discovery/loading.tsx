export default function LeadDiscoveryLoading() {
  return (
    <div className="relative space-y-6">
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--shell-brand] shimmer-glow" />

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-28 rounded-md shimmer-glow" />
          <div className="h-4 w-64 rounded shimmer-glow" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="h-4 w-32 rounded shimmer-glow" />
        <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-6 space-y-4">
          <div className="flex gap-3">
            <div className="h-10 flex-1 rounded-md border border-[--shell-border] bg-[--shell-surface] shimmer-glow" />
            <div className="h-10 w-28 rounded-md shimmer-glow" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-4.5 w-36 rounded shimmer-glow" />
            <div className="h-9 w-40 rounded-lg shimmer-glow" />
          </div>
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-5 w-48 rounded shimmer-glow" />
                    <div className="h-3 w-32 rounded shimmer-glow" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-5.5 w-16 rounded-full shimmer-glow" />
                    <div className="h-9 w-28 rounded-lg shimmer-glow" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs lg:grid-cols-4 pt-3 border-t border-[--shell-border]/20">
                  <div className="h-4 w-28 rounded shimmer-glow" />
                  <div className="h-4 w-28 rounded shimmer-glow" />
                  <div className="h-4 w-28 rounded shimmer-glow" />
                  <div className="h-4 w-28 rounded shimmer-glow" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
