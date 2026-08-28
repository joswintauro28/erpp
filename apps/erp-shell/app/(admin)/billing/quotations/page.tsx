"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, FileText, Edit, Trash2, CheckCircle, XCircle,
  Send, ClipboardList, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { searchBilling, money, statusVariant } from "@/utils/format";
import type { Quotation } from "@/types/billing";
import { api } from "@/services/api";
import { handleError } from "@datavex/ui-theme";
import QuotationsLoading from "./loading";

const statusOptions = ["", "draft", "sent", "accepted", "rejected", "expired"] as const;


export default function Quotations() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const qData = await api.get<Quotation[]>("/invoices/quotations");
        setQuotes(qData);
      } catch (err) {
        handleError(err, "Failed to load quotations data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const searched = searchBilling(quotes, search);
    if (!statusFilter) return searched;
    return searched.filter((q) => q.status === statusFilter);
  }, [quotes, search, statusFilter]);

  // Create/edit go through the dedicated QuotationForm pages, which send the
  // billing-service DTO shape (clientId + clientName + items).
  const openCreate = () => router.push("/billing/quotations/new");

  const openEdit = (q: Quotation) => router.push(`/billing/quotations/${q.id}/edit`);

  const updateStatus = async (id: number, status: Quotation["status"]) => {
    try {
      const updated = await api.put<Quotation>(`/invoices/quotations/${id}/status?status=${status}`);
      setQuotes((prev) => prev.map((q) => q.id === id ? updated : q));
    } catch (err) {
      handleError(err, "Failed to update status");
    }
  };

  const handleConvert = async (id: number) => {
    if (!confirm("Convert this quotation to a sales invoice?")) return;
    try {
      await api.post(`/invoices/quotations/${id}/convert`);
      // Reload list to get updated status and link
      const updatedQuotes = await api.get<Quotation[]>("/invoices/quotations");
      setQuotes(updatedQuotes);
    } catch (err) {
      handleError(err, "Failed to convert quotation");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await api.delete(`/invoices/quotations/${id}`);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      handleError(err, "Failed to delete quotation");
    }
  };

  if (loading) {
    return <QuotationsLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Quotations
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Create and manage client quotations
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Quotation
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
          <Input
            placeholder="Search quotations..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v !== null && setStatusFilter(v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {statusOptions.filter(Boolean).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-[var(--shell-muted)]">
                <ClipboardList className="h-10 w-10" />
                <p className="text-sm">No quotations found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-xs font-medium">{q.quote_number}</TableCell>
                      <TableCell>{q.client_name}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{money(q.total)}</TableCell>
                      <TableCell className="text-xs text-[var(--shell-muted)]">{q.issue_date}</TableCell>
                      <TableCell className="text-xs text-[var(--shell-muted)]">{q.valid_until}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant("quotation", q.status)} className="capitalize">
                          {q.status}
                          {q.converted_invoice_id && " (Invoiced)"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {q.status === "draft" && (
                            <Button variant="ghost" size="icon-sm" onClick={() => updateStatus(q.id, "sent")} title="Mark as Sent">
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {q.status === "sent" && (
                            <>
                              <Button variant="ghost" size="icon-sm" onClick={() => updateStatus(q.id, "accepted")} title="Accept">
                                <CheckCircle className="h-3.5 w-3.5 text-[var(--shell-success)]" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => updateStatus(q.id, "rejected")} title="Reject">
                                <XCircle className="h-3.5 w-3.5 text-[var(--shell-danger)]" />
                              </Button>
                            </>
                          )}
                          {q.status === "accepted" && !q.converted_invoice_id && (
                            <Button variant="ghost" size="icon-sm" onClick={() => handleConvert(q.id)} title="Convert to invoice">
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(q)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(q.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-[var(--shell-danger)]" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

    </div>
  );
}
