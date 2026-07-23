export default function AIAssistantLoading() {
  return (
    <div className="relative space-y-6">
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-28 rounded-md shimmer-glow" />
          <div className="h-4 w-64 rounded shimmer-glow" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <div className="h-4 w-20 rounded shimmer-glow" />
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-6 space-y-4">
            <div className="min-h-[320px] flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-4 w-24 rounded shimmer-glow" />
                <div className="h-24 w-full rounded-lg border border-[var(--shell-border)]/40 shimmer-glow" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 flex-1 rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] shimmer-glow" />
            <div className="h-10 w-24 rounded-md shimmer-glow" />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="h-4 w-24 rounded shimmer-glow" />
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4.5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 pb-3 border-b border-[var(--shell-border)]/20 last:border-b-0">
                <div className="h-4 w-3/4 rounded shimmer-glow" />
                <div className="h-3 w-1/2 rounded shimmer-glow" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
