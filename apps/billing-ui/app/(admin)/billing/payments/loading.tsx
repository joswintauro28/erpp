import { Card, CardContent } from "@/components/ui/card";

export default function PaymentsLoading() {
  return (
    <div className="relative space-y-6">
      {/* Brand progress sweep bar */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-24 rounded-md shimmer-glow" />
          <div className="h-4 w-64 rounded shimmer-glow" />
        </div>
        <div className="h-9 w-32 rounded-lg shimmer-glow" />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="h-8 w-8 rounded-lg shimmer-glow shrink-0" />
              <div className="space-y-1.5">
                <div className="h-4 w-20 rounded shimmer-glow" />
                <div className="h-3.5 w-12 rounded shimmer-glow" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search Input */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 w-64 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] shimmer-glow" />
      </div>

      {/* Table Mock Layout */}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 border-b border-[var(--shell-border)] bg-[var(--shell-surface-alt)]/50 px-6 py-3">
            <div className="col-span-3"><div className="h-3.5 w-16 rounded shimmer-glow" /></div>
            <div className="col-span-2 text-right"><div className="h-3.5 w-12 rounded shimmer-glow ml-auto" /></div>
            <div className="col-span-3"><div className="h-3.5 w-24 rounded shimmer-glow" /></div>
            <div className="col-span-3"><div className="h-3.5 w-16 rounded shimmer-glow" /></div>
            <div className="col-span-1 text-right flex justify-end"><div className="h-3.5 w-8 rounded shimmer-glow" /></div>
          </div>
          {/* Table Rows */}
          <div className="divide-y divide-[var(--shell-border)]/40">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                <div className="col-span-3"><div className="h-4 w-28 rounded shimmer-glow" /></div>
                <div className="col-span-2 text-right"><div className="h-4 w-16 rounded shimmer-glow ml-auto" /></div>
                <div className="col-span-3"><div className="h-4 w-20 rounded shimmer-glow" /></div>
                <div className="col-span-3"><div className="h-4 w-24 rounded shimmer-glow" /></div>
                <div className="col-span-1 flex justify-end"><div className="h-6 w-6 rounded-md shimmer-glow" /></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
