import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CrmDashboardLoading() {
  return (
    <div className="space-y-10 lg:space-y-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {/* KPI Strip */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <Skeleton className="h-3 w-24" />
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-md" />
          ))}
        </div>
      </section>

      {/* Charts */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <Skeleton className="h-3 w-32" />
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent className="h-72 flex items-end justify-between gap-2 pt-6">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="w-full rounded-t-md" style={{ height: `${[50, 75, 60, 85, 40][j]}%` }} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent className="h-72 flex items-end justify-between gap-2 pt-6">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="w-full rounded-t-md" style={{ height: `${[40, 65, 55, 80, 70, 90][j]}%` }} />
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Activity */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <Skeleton className="h-3 w-28" />
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20 font-bold" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
