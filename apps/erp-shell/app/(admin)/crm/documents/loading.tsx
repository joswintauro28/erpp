import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DocumentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Skeleton className="h-9 w-full sm:w-72" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-4 w-36" />
              <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border/50">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
