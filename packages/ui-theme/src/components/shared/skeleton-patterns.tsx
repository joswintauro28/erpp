"use client";

import { Skeleton } from "../ui/skeleton";
import { Card, CardContent, CardHeader } from "../ui/card";

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/**
 * Reusable table skeleton with header + N rows.
 */
export function SkeletonTable({ rows = 5, columns = 5, className }: SkeletonTableProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-20" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4 border-b border-border pb-2">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-3 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2.5 border-b border-border/50 last:border-0">
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SkeletonCardGridProps {
  count?: number;
  className?: string;
}

/**
 * Reusable card grid skeleton (KPI cards, etc.)
 */
export function SkeletonCardGrid({ count = 3, className }: SkeletonCardGridProps) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-${count} ${className || ""}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-6 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface SkeletonFormProps {
  fields?: number;
  className?: string;
}

/**
 * Reusable form skeleton with N input fields.
 */
export function SkeletonForm({ fields = 5, className }: SkeletonFormProps) {
  return (
    <div className={`space-y-4 ${className || ""}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

interface SkeletonPageHeaderProps {
  className?: string;
}

/**
 * Reusable page header skeleton.
 */
export function SkeletonPageHeader({ className }: SkeletonPageHeaderProps) {
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5 ${className || ""}`}>
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-9 w-36" />
    </div>
  );
}
