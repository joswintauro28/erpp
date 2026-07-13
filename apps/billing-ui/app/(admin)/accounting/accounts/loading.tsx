import { Card, CardContent } from "@/components/ui/card";

export default function ChartOfAccountsLoading() {
  return (
    <div className="relative space-y-6">
      {/* Brand progress sweep bar */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--shell-brand] shimmer-glow" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-44 rounded-md shimmer-glow" />
          <div className="h-4 w-64 rounded shimmer-glow" />
        </div>
        <div className="h-9 w-32 rounded-lg shimmer-glow" />
      </div>

      {/* Account Type KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3.5 space-y-2.5">
              <div className="h-3.5 w-16 rounded shimmer-glow" />
              <div className="h-5 w-24 rounded shimmer-glow mt-1" />
              <div className="h-3 w-16 rounded shimmer-glow" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Registry Table Layout */}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {/* Filters Bar */}
          <div className="flex items-center gap-3 border-b border-[--shell-border] p-3">
            <div className="h-9 w-64 rounded-lg border border-[--shell-border] bg-[--shell-surface] shimmer-glow" />
          </div>
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 border-b border-[--shell-border] bg-[--shell-surface-alt]/50 px-6 py-3">
            <div className="col-span-1.5"><div className="h-3.5 w-10 rounded shimmer-glow" /></div>
            <div className="col-span-3.5"><div className="h-3.5 w-24 rounded shimmer-glow" /></div>
            <div className="col-span-2.5"><div className="h-3.5 w-16 rounded shimmer-glow" /></div>
            <div className="col-span-1.5 text-right"><div className="h-3.5 w-12 rounded shimmer-glow ml-auto" /></div>
            <div className="col-span-1.5 text-right"><div className="h-3.5 w-12 rounded shimmer-glow ml-auto" /></div>
            <div className="col-span-1.5 text-right flex justify-end"><div className="h-3.5 w-8 rounded shimmer-glow" /></div>
          </div>
          {/* Table Rows */}
          <div className="divide-y divide-[--shell-border]/40">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                <div className="col-span-1.5"><div className="h-4 w-12 rounded shimmer-glow" /></div>
                <div className="col-span-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full shimmer-glow" />
                    <div className="h-4 w-32 rounded shimmer-glow" />
                  </div>
                </div>
                <div className="col-span-2.5"><div className="h-4 w-20 rounded shimmer-glow" /></div>
                <div className="col-span-1.5 text-right"><div className="h-4 w-14 rounded shimmer-glow ml-auto" /></div>
                <div className="col-span-1.5 text-right"><div className="h-4 w-14 rounded shimmer-glow ml-auto" /></div>
                <div className="col-span-1.5 flex justify-end"><div className="h-6 w-6 rounded-md shimmer-glow" /></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
