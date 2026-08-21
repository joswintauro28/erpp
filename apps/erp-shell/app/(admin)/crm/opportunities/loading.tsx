import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function OpportunitiesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, colIdx) => (
          <div key={colIdx} className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border/60">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>
            {Array.from({ length: colIdx % 2 === 0 ? 2 : 3 }).map((_, cardIdx) => (
              <Card key={cardIdx}>
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-4 w-16 font-bold" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
