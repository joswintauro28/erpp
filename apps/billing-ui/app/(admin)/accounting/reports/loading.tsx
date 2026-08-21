import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AccountingReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-border/50">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24 font-bold" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
