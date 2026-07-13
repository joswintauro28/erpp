import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvoiceDetailLoading() {
  return (
    <div className="relative space-y-8">
      {/* Brand progress sweep bar */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--shell-brand] shimmer-glow" />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg shimmer-glow" />
        <div className="space-y-2">
          <div className="h-6 w-32 rounded-md shimmer-glow" />
          <div className="h-4 w-48 rounded shimmer-glow" />
        </div>
      </div>

      {/* Invoice Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-start border-b border-[--shell-border]/10 pb-4">
              <div className="space-y-3">
                <div className="h-4.5 w-20 rounded shimmer-glow" />
                <div className="h-6 w-36 rounded-md shimmer-glow" />
              </div>
              <div className="h-6 w-20 rounded-full shimmer-glow" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="h-3 w-16 rounded shimmer-glow" />
                  <div className="h-4 w-24 rounded shimmer-glow" />
                </div>
              ))}
            </div>

            {/* Items Table skeleton */}
            <div className="space-y-3">
              <div className="h-4 w-24 rounded shimmer-glow" />
              <div className="rounded-lg border border-[--shell-border] overflow-hidden">
                <div className="grid grid-cols-12 gap-3 bg-[--shell-surface-alt]/40 px-4 py-2">
                  <div className="col-span-5"><div className="h-3.5 w-16 rounded shimmer-glow" /></div>
                  <div className="col-span-2 text-right"><div className="h-3.5 w-8 rounded shimmer-glow ml-auto" /></div>
                  <div className="col-span-2 text-right"><div className="h-3.5 w-12 rounded shimmer-glow ml-auto" /></div>
                  <div className="col-span-3 text-right"><div className="h-3.5 w-10 rounded shimmer-glow ml-auto" /></div>
                </div>
                <div className="divide-y divide-[--shell-border]/30 px-4">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="grid grid-cols-12 gap-3 py-3 items-center">
                      <div className="col-span-5"><div className="h-4 w-32 rounded shimmer-glow" /></div>
                      <div className="col-span-2 text-right"><div className="h-4 w-6 rounded shimmer-glow ml-auto" /></div>
                      <div className="col-span-2 text-right"><div className="h-4 w-12 rounded shimmer-glow ml-auto" /></div>
                      <div className="col-span-3 text-right"><div className="h-4 w-14 rounded shimmer-glow ml-auto" /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History and Metadata panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle><div className="h-4.5 w-28 rounded shimmer-glow" /></CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between items-center py-2 border-b border-[--shell-border]/10 last:border-0">
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-20 rounded shimmer-glow" />
                    <div className="h-3 w-16 rounded shimmer-glow" />
                  </div>
                  <div className="h-4 w-12 rounded shimmer-glow" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
