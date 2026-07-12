export default function ProductsLoading() {
  return (
    <div className="relative animate-pulse">
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--shell-brand] motion-reduce:hidden" />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-24 rounded-lg bg-[--shell-surface-alt]" />
          <div className="h-4 w-44 rounded-lg bg-[--shell-surface-alt]" />
        </div>
        <div className="h-8 w-32 rounded-lg bg-[--shell-surface-alt]" />
      </div>

      <div className="mb-5 mt-8 flex items-center gap-2">
        <div className="h-3 w-32 rounded bg-[--shell-surface-alt]" />
        <div className="h-px flex-1 bg-[--shell-border]" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-5"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-[--shell-surface-alt]" />
              <div className="h-7 w-7 rounded-md border border-[--shell-border] bg-[--shell-surface]" />
            </div>
            <div className="mt-3 h-7 w-16 rounded bg-[--shell-surface-alt]" />
            <div className="mt-1.5 h-3 w-28 rounded bg-[--shell-surface-alt]" />
          </div>
        ))}
      </div>

      <div className="mb-5 mt-8 flex items-center gap-2">
        <div className="h-3 w-28 rounded bg-[--shell-surface-alt]" />
        <div className="h-px flex-1 bg-[--shell-border]" />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="h-9 max-w-xs flex-1 rounded-lg bg-[--shell-surface-alt]" />
        <div className="h-9 w-36 rounded-lg bg-[--shell-surface-alt]" />
      </div>

      <div className="overflow-hidden rounded-xl border border-[--shell-border] bg-[--shell-surface]">
        <div className="border-b border-[--shell-border] bg-[--shell-surface]">
          <div className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-3 rounded bg-[--shell-surface-alt]"
                style={{ width: `${[12, 24, 16, 10, 12, 12, 8, 18, 10, 8][i]}%` }}
              />
            ))}
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[--shell-border] px-4 py-3.5 last:border-0"
          >
            {Array.from({ length: 10 }).map((_, j) => (
              <div
                key={j}
                className="h-3.5 rounded bg-[--shell-surface-alt]"
                style={{ width: `${[12, 24, 16, 10, 12, 12, 8, 18, 10, 8][j]}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
