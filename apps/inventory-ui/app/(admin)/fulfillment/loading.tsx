import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function FulfillmentLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-60" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-10" />
              </div>
              <Skeleton className="h-6 w-6 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, colIdx) => (
          <div key={colIdx} className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border/60">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>
            {Array.from({ length: colIdx % 2 === 0 ? 2 : 3 }).map((_, cardIdx) => (
              <Card key={cardIdx}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20 font-mono" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-3 w-28" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-16 rounded-md" />
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
