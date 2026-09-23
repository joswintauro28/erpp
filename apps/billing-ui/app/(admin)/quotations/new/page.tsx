"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuotationForm from "@/components/quotation-form";

export default function NewQuotation() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/quotations")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">New Quotation</h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Create a new quotation for a client</p>
        </div>
      </div>

      <QuotationForm
        mode="create"
        onSuccess={() => router.push("/quotations")}
      />
    </div>
  );
}
