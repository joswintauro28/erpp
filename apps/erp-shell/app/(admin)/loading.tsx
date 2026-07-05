export default function AdminLoading() {
  return (
    <div className="relative animate-pulse">
      {/* Brand progress bar */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--shell-brand] motion-reduce:hidden" />

      <div className="flex items-center justify-between">
        <div className="h-7 w-44 rounded-lg bg-[--shell-surface-alt]" />
        <div className="h-7 w-28 rounded-lg bg-[--shell-surface-alt]" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-[--shell-border] bg-[--shell-surface]"
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-xl border border-[--shell-border] bg-[--shell-surface]" />
        <div className="h-72 rounded-xl border border-[--shell-border] bg-[--shell-surface]" />
      </div>

      <div className="mt-6 space-y-3">
        <div className="h-9 w-full rounded-lg bg-[--shell-surface-alt]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-11 w-full rounded-lg border border-[--shell-border] bg-[--shell-surface]"
          />
        ))}
      </div>
    </div>
  );
}
