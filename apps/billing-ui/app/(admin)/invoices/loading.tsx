import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function InvoicesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Skeleton className="h-9 w-full sm:w-72" />
        <Skeleton className="h-9 w-36" />
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                <Skeleton className="h-4 w-24 font-mono" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20 font-bold" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
