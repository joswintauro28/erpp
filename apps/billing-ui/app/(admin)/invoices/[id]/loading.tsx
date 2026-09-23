import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function InvoiceDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-6 w-32" /></CardContent></Card>
        ))}
      </div>
      <Card><CardHeader><Skeleton className="h-4 w-40" /></CardHeader>
        <CardContent><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div></CardContent>
      </Card>
    </div>
  );
}
