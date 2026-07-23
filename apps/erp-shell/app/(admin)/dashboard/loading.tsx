import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="relative space-y-10 lg:space-y-12">
      {/* Brand progress sweep bar */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-44 rounded-md shimmer-glow" />
          <div className="h-4 w-60 rounded shimmer-glow" />
        </div>
        <div className="h-9 w-32 rounded-lg shimmer-glow" />
      </div>

      {/* Primary KPIs */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 rounded shimmer-glow" />
          <div className="h-px flex-1 bg-[var(--shell-border)]/20" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="h-4.5 w-24 rounded shimmer-glow" />
                  <div className="h-7 w-7 rounded-lg shimmer-glow" />
                </div>
                <div className="h-7.5 w-32 rounded-md shimmer-glow mt-1" />
                <div className="h-3.5 w-36 rounded shimmer-glow" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Actions Panel */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-28 rounded shimmer-glow" />
          <div className="h-px flex-1 bg-[var(--shell-border)]/20" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8.5 w-32 rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] shimmer-glow" />
          ))}
        </div>
      </section>

      {/* Analytics Charts Grid */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 rounded shimmer-glow" />
          <div className="h-px flex-1 bg-[var(--shell-border)]/20" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Trend Chart Card */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--shell-border)]/20 pb-3">
                <div className="space-y-1.5">
                  <div className="h-4.5 w-32 rounded shimmer-glow" />
                  <div className="h-3 w-48 rounded shimmer-glow" />
                </div>
                <div className="h-6 w-20 rounded-md shimmer-glow" />
              </div>
              <div className="h-56 flex items-end justify-between gap-4 pt-4 px-2">
                {[45, 75, 55, 95, 65, 85, 70, 90, 60, 80, 50, 85].map((h, j) => (
                  <div
                    key={j}
                    style={{ height: `${h}%` }}
                    className="w-full rounded-t-sm shimmer-glow opacity-80"
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Distribution Chart Card */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--shell-border)]/20 pb-3">
                <div className="space-y-1.5">
                  <div className="h-4.5 w-36 rounded shimmer-glow" />
                  <div className="h-3 w-40 rounded shimmer-glow" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center h-56 pt-2">
                {/* Mock Ring */}
                <div className="col-span-7 flex justify-center items-center relative">
                  <div className="h-40 w-40 rounded-full border-[14px] border-[var(--shell-surface-alt)] flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center rounded-full h-24 w-24 border border-[var(--shell-border)] bg-[var(--shell-surface)] shadow-sm">
                      <div className="h-6 w-10 rounded shimmer-glow" />
                      <div className="h-3 w-12 rounded shimmer-glow mt-1.5" />
                    </div>
                  </div>
                </div>
                {/* Mock Legend */}
                <div className="col-span-5 space-y-3.5 pr-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full shimmer-glow" />
                          <div className="h-3.5 w-16 rounded shimmer-glow" />
                        </div>
                        <div className="h-3.5 w-8 rounded shimmer-glow" />
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[var(--shell-surface-alt)]" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Activity Grid */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 rounded shimmer-glow" />
          <div className="h-px flex-1 bg-[var(--shell-border)]/20" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Invoices list */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="h-4 w-32 rounded shimmer-glow" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-[var(--shell-border)]/10 last:border-0">
                    <div className="space-y-1.5">
                      <div className="h-4 w-28 rounded shimmer-glow" />
                      <div className="h-3.5 w-20 rounded shimmer-glow" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-5.5 w-16 rounded-full shimmer-glow" />
                      <div className="h-4 w-12 rounded shimmer-glow" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerts / Tasks list */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="h-4 w-32 rounded shimmer-glow" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="flex gap-3 py-2">
                    <div className="h-8 w-8 rounded-full shimmer-glow shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-full rounded shimmer-glow" />
                      <div className="h-3.5 w-1/3 rounded shimmer-glow" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Summary Row */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 rounded shimmer-glow" />
          <div className="h-px flex-1 bg-[var(--shell-border)]/20" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx}>
              <CardContent className="flex items-center gap-3 p-4.5">
                <div className="h-8 w-8 rounded-lg shimmer-glow" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-20 rounded shimmer-glow" />
                  <div className="h-4 w-24 rounded shimmer-glow" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
