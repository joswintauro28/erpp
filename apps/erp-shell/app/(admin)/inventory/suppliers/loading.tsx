export default function SuppliersLoading() {
  return (
    <div className="relative animate-pulse">
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--shell-brand] motion-reduce:hidden" />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-24 rounded-lg bg-[--shell-surface-alt]" />
          <div className="h-4 w-52 rounded-lg bg-[--shell-surface-alt]" />
        </div>
        <div className="h-8 w-32 rounded-lg bg-[--shell-surface-alt]" />
      </div>

      <div className="mt-6 h-9 max-w-xs rounded-lg bg-[--shell-surface-alt]" />

      <div className="mt-6 overflow-hidden rounded-xl border border-[--shell-border] bg-[--shell-surface]">
        <div className="border-b border-[--shell-border] bg-[--shell-surface]">
          <div className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-3 rounded bg-[--shell-surface-alt]"
                style={{ width: `${[16, 14, 16, 12, 12, 8, 12, 8, 8][i]}%` }}
              />
            ))}
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[--shell-border] px-4 py-3.5 last:border-0"
          >
            {Array.from({ length: 9 }).map((_, j) => (
              <div
                key={j}
                className="h-3.5 rounded bg-[--shell-surface-alt]"
                style={{ width: `${[16, 14, 16, 12, 12, 8, 12, 8, 8][j]}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
