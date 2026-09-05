"use client";

import { Spinner } from "@/components/ui/spinner";

export default function LeadsLoading() {
  return (
    <div className="space-y-10 lg:space-y-12">
      <div className="flex h-full items-center justify-center py-20">
        <Spinner />
      </div>
    </div>
  );
}
