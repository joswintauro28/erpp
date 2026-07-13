import { Card, CardContent } from "@/components/ui/card";

export default function ReportsLoading() {
  return (
    <div className="relative space-y-6">
      {/* Brand progress sweep bar */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--shell-brand] shimmer-glow" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-36 rounded-md shimmer-glow" />
          <div className="h-4 w-64 rounded shimmer-glow" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[--shell-border] pb-1">
        <div className="h-8 w-24 rounded shimmer-glow" />
        <div className="h-8 w-24 rounded shimmer-glow" />
        <div className="h-8 w-24 rounded shimmer-glow" />
      </div>

      {/* P&L Layout metrics */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3.5 space-y-2">
              <div className="h-3.5 w-16 rounded shimmer-glow" />
              <div className="h-5 w-24 rounded shimmer-glow mt-1" />
              <div className="h-3 w-28 rounded shimmer-glow" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart skeleton */}
      <Card>
        <CardContent className="p-5 h-64 flex items-end justify-between gap-6">
          {[60, 80, 55, 90, 75, 85].map((h, idx) => (
            <div key={idx} style={{ height: `${h}%` }} className="w-full flex gap-2 justify-center items-end">
              <div className="w-8 h-full rounded-t bg-[--shell-surface-alt] shimmer-glow" />
              <div className="w-8 h-2/3 rounded-t bg-[--shell-surface-alt]/50 shimmer-glow" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Table Mock Layout */}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="grid grid-cols-12 gap-4 border-b border-[--shell-border] bg-[--shell-surface-alt]/50 px-6 py-3">
            <div className="col-span-4"><div className="h-3.5 w-16 rounded shimmer-glow" /></div>
            <div className="col-span-8 text-right"><div className="h-3.5 w-24 rounded shimmer-glow ml-auto" /></div>
          </div>
          <div className="divide-y divide-[--shell-border]/40">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                <div className="col-span-4"><div className="h-4 w-32 rounded shimmer-glow" /></div>
                <div className="col-span-8 text-right"><div className="h-4 w-16 rounded shimmer-glow ml-auto" /></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
