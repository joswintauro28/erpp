"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Plus, Loader2,
  Eye, Send, Ban, Trash2, Receipt,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/services/api";
import { money, formatDate, quotationStatusVariant as statusVariant } from "@/utils/format";
import { useAuth } from "@/contexts/AuthContext";
import type { Quotation } from "@/types/billing";
import QuotationsLoading from "./loading";

const statusOptions = ["draft", "sent", "accepted", "rejected", "expired"];

export default function Quotations() {
  const router = useRouter();
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const canCreate = permissions.includes("quotations.create");
  const canEdit = permissions.includes("quotations.edit");
  const canDelete = permissions.includes("quotations.delete");

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get<Quotation[]>("/invoices/quotations")
      .then(setQuotations)
      .catch(() => setQuotations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const searched = q
      ? quotations.filter((qt) =>
          qt.quote_number.toLowerCase().includes(q) ||
          qt.client_name.toLowerCase().includes(q) ||
          qt.status.toLowerCase().includes(q))
      : quotations;
    if (!statusFilter) return searched;
    return searched.filter((qt) => qt.status === statusFilter);
  }, [quotations, search, statusFilter]);

  const handleConvert = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/invoices/quotations/${id}/convert`);
      load();
    } catch { /* handled */ } finally { setActionLoading(null); }
  };

  const handleStatusChange = async (id: number, status: string) => {
    setActionLoading(id);
    try {
      await api.put(`/invoices/quotations/${id}/status?status=${status}`);
      load();
    } catch { /* handled */ } finally { setActionLoading(null); }
  };

  const handleDelete = async (id: number) => {
    setDeleteSaving(true);
    try {
      await api.delete(`/invoices/quotations/${id}`);
      setDeleteConfirm(null);
      load();
    } catch { /* handled */ } finally { setDeleteSaving(false); }
  };



  if (loading) return <QuotationsLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">Quotations</h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Create and manage client quotations</p>
        </div>
        {canCreate && <Button aria-label="Create Quotation" onClick={() => router.push("/billing/quotations/new")}><Plus className="h-4 w-4" /> New Quotation</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search quotations..." className="flex-1 max-w-xs" />
        <Select value={statusFilter} onValueChange={(v) => v !== null && setStatusFilter(v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={ClipboardList} title={quotations.length === 0 ? "No quotations yet" : "No quotations match your search"} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((qt) => (
                  <TableRow key={qt.id}>
                    <TableCell className="cursor-pointer" onClick={() => router.push(`/billing/quotations/${qt.id}`)}>
                      <span className="font-mono text-xs font-medium hover:text-[var(--shell-brand)] transition-colors">{qt.quote_number}</span>
                    </TableCell>
                    <TableCell className="text-[var(--shell-muted)]">{qt.client_name}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(qt.total)}</TableCell>
                    <TableCell><Badge variant={statusVariant(qt.status)} className="capitalize">{qt.status}</Badge></TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">{formatDate(qt.issue_date)}</TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">{formatDate(qt.valid_until)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => router.push(`/billing/quotations/${qt.id}`)}
                          aria-label="View quotation"
                          title="View quotation"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canEdit && qt.status === "draft" && (
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => handleStatusChange(qt.id, "sent")}
                            disabled={actionLoading === qt.id}
                            aria-label="Send quotation"
                            title="Send quotation"
                          >
                            {actionLoading === qt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        {canEdit && qt.status === "sent" && (
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => handleStatusChange(qt.id, "rejected")}
                            disabled={actionLoading === qt.id}
                            aria-label="Mark as rejected"
                            title="Mark as rejected"
                          >
                            {actionLoading === qt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        {canEdit && qt.status === "accepted" && !qt.converted_invoice_id && (
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => handleConvert(qt.id)}
                            disabled={actionLoading === qt.id}
                            aria-label="Convert to invoice"
                            title="Convert to invoice"
                          >
                            {actionLoading === qt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        {canDelete && qt.status === "draft" && (
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => setDeleteConfirm(qt.id)}
                            aria-label="Delete quotation"
                            title="Delete quotation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Quotation</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--shell-muted)]">
            Are you sure you want to delete this quotation? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={deleteSaving}>
              {deleteSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
