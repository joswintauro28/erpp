import { Card, CardContent } from "@/components/ui/card";

export default function EntityManagementLoading() {
  return (
    <div className="relative space-y-6">
      {/* Brand progress sweep bar */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--sidebar-active-bg] shimmer-glow" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-muted shimmer-glow" />
          <div className="h-6 w-48 rounded-md bg-muted shimmer-glow" />
          <div className="h-4 w-72 rounded bg-muted shimmer-glow" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 rounded-lg bg-muted shimmer-glow" />
          <div className="h-9 w-32 rounded-lg bg-muted shimmer-glow" />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <div className="h-3.5 w-24 rounded bg-muted shimmer-glow" />
              <div className="h-7 w-12 rounded bg-muted shimmer-glow mt-1" />
              <div className="h-3 w-16 rounded bg-muted shimmer-glow" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search Input & Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 border-b border-[--shell-border] px-6 py-3 bg-[--shell-surface-alt]/20">
          <div className="h-9 w-64 rounded-lg border border-[--shell-border] bg-[--shell-surface] shimmer-glow" />
          <div className="h-9 w-24 rounded-lg border border-[--shell-border] bg-[--shell-surface] shimmer-glow" />
        </div>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 border-b border-[--shell-border] bg-[--shell-surface-alt]/50 px-6 py-3">
            <div className="col-span-3"><div className="h-3.5 w-16 rounded bg-muted shimmer-glow" /></div>
            <div className="col-span-2.5"><div className="h-3.5 w-14 rounded bg-muted shimmer-glow" /></div>
            <div className="col-span-2.5"><div className="h-3.5 w-14 rounded bg-muted shimmer-glow" /></div>
            <div className="col-span-2"><div className="h-3.5 w-16 rounded bg-muted shimmer-glow" /></div>
            <div className="col-span-1.5 text-right flex justify-end"><div className="h-3.5 w-8 rounded bg-muted shimmer-glow" /></div>
          </div>
          {/* Table Rows */}
          <div className="divide-y divide-[--shell-border]/40">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                <div className="col-span-3"><div className="h-4 w-32 rounded bg-muted shimmer-glow" /></div>
                <div className="col-span-2.5"><div className="h-4 w-20 rounded bg-muted shimmer-glow" /></div>
                <div className="col-span-2.5"><div className="h-4 w-12 rounded bg-muted shimmer-glow" /></div>
                <div className="col-span-2"><div className="h-4 w-14 rounded bg-muted shimmer-glow" /></div>
                <div className="col-span-1.5 flex justify-end"><div className="h-6 w-6 rounded-md bg-muted shimmer-glow" /></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
