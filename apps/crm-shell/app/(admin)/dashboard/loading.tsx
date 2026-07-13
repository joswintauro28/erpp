import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="relative space-y-6">
      {/* Brand progress sweep bar */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--sidebar-active-bg] shimmer-glow" />

      {/* Header Info */}
      <div className="space-y-1">
        <div className="h-6 w-44 rounded-md bg-muted shimmer-glow" />
        <div className="h-4 w-72 rounded bg-muted shimmer-glow" />
      </div>

      {/* Primary KPIs */}
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

      {/* Charts / AI Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="h-4 w-32 rounded bg-muted shimmer-glow" />
            <div className="h-56 flex items-end justify-between gap-4 pt-4 px-2">
              {[45, 75, 55, 95, 65, 85].map((h, j) => (
                <div
                  key={j}
                  style={{ height: `${h}%` }}
                  className="w-full rounded-t-sm bg-muted shimmer-glow opacity-80"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="h-4 w-44 rounded bg-muted shimmer-glow" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex gap-3 py-2 border-b border-[--shell-border]/10 last:border-0">
                  <div className="h-6 w-6 rounded bg-muted shimmer-glow shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-full rounded bg-muted shimmer-glow" />
                    <div className="h-3 w-1/3 rounded bg-muted shimmer-glow" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="h-4 w-32 rounded bg-muted shimmer-glow" />
            <div className="h-24 bg-muted/20 rounded shimmer-glow flex items-center justify-center" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="h-4 w-32 rounded bg-muted shimmer-glow" />
            <div className="h-24 bg-muted/20 rounded shimmer-glow flex items-center justify-center" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
