import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function FormLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-48" />
      <Card><CardHeader><Skeleton className="h-4 w-40" /></CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    </div>
  );
}
