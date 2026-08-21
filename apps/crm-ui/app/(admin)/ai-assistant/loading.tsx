import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function CrmAiAssistantLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      <Card className="h-[550px] flex flex-col justify-between">
        <CardContent className="p-6 space-y-4 flex-1">
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1 max-w-md">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <div className="space-y-2 max-w-md">
              <Skeleton className="h-4 w-48 ml-auto" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </CardContent>
        <div className="p-4 border-t border-border flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
      </Card>
    </div>
  );
}
