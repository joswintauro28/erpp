export default function WarehousesLoading() {
  return (
    <div className="relative animate-pulse">
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--shell-brand] motion-reduce:hidden" />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-28 rounded-lg bg-[--shell-surface-alt]" />
          <div className="h-4 w-36 rounded-lg bg-[--shell-surface-alt]" />
        </div>
        <div className="h-8 w-36 rounded-lg bg-[--shell-surface-alt]" />
      </div>

      <div className="mt-6 h-9 max-w-xs rounded-lg bg-[--shell-surface-alt]" />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-[--shell-surface-alt]" />
                <div className="h-4 w-36 rounded bg-[--shell-surface-alt]" />
              </div>
              <div className="h-5 w-14 rounded-full bg-[--shell-surface-alt]" />
            </div>
            <div className="mt-2 h-3 w-20 rounded bg-[--shell-surface-alt]" />
            <div className="mt-1 h-3 w-48 rounded bg-[--shell-surface-alt]" />
          </div>
        ))}
      </div>
    </div>
  );
}
