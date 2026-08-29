import { Skeleton } from "@datavex/ui-theme";

export default function AIAssistantLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-[var(--shell-border)] bg-[var(--shell-surface)] px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2.5 items-start">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div className="shrink-0 border-t border-[var(--shell-border)] bg-[var(--shell-surface)] p-3">
        <div className="flex gap-2 items-center">
          <Skeleton className="h-[38px] flex-1 rounded-lg" />
          <Skeleton className="h-[38px] w-[38px] rounded-lg shrink-0" />
        </div>
      </div>
    </div>
  );
}
