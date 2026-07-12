export default function SerialsLoading() {
  return (
    <div className="relative animate-pulse">
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--shell-brand] motion-reduce:hidden" />

      <div className="space-y-1">
        <div className="h-7 w-28 rounded-lg bg-[--shell-surface-alt]" />
        <div className="h-4 w-56 rounded-lg bg-[--shell-surface-alt]" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="h-9 max-w-xs flex-1 rounded-lg bg-[--shell-surface-alt]" />
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-lg bg-[--shell-surface-alt]" />
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-[--shell-border] bg-[--shell-surface]">
        <div className="border-b border-[--shell-border] bg-[--shell-surface]">
          <div className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-3 rounded bg-[--shell-surface-alt]"
                style={{ width: `${[20, 14, 14, 14, 16][i]}%` }}
              />
            ))}
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[--shell-border] px-4 py-3.5 last:border-0"
          >
            {Array.from({ length: 5 }).map((_, j) => (
              <div
                key={j}
                className="h-3.5 rounded bg-[--shell-surface-alt]"
                style={{ width: `${[20, 14, 14, 14, 16][j]}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
