"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import QuotationForm from "@/components/quotation-form";
import type { QuotationDetailView } from "@/types/billing";

export default function EditQuotation() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [data, setData] = useState<QuotationDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || isNaN(id)) {
      setError("Invalid quotation ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<QuotationDetailView>(`/invoices/quotations/${id}`)
      .then((q) => {
        if (q.status !== "draft") {
          setError("Only draft quotations can be edited");
          return;
        }
        setData(q);
      })
      .catch(() => setError("Failed to load quotation"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[--shell-muted]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            {error}
          </h1>
        </div>
        <Button variant="outline" onClick={() => router.push("/billing/quotations")}>
          Back to Quotations
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Edit Quotation
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">{data.quote_number}</p>
        </div>
      </div>

      <QuotationForm
        mode="edit"
        initialData={data}
        onSuccess={() => router.push(`/billing/quotations/${id}`)}
      />
    </div>
  );
}
