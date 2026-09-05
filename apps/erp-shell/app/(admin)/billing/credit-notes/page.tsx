"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { FileText, Plus, Loader2, Trash2, Receipt, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/services/api";
import { toastSuccess, toastError } from "@/utils/toast";
import { SearchInput, EmptyState, PageHeader, handleError, KpiCard } from "@datavex/ui-theme";
import { money, noteStatusVariant as statusVariant } from "@/utils/format";
import type { CreditNote } from "@/types/billing";
import CreditNotesLoading from "./loading";

export default function CreditNotes() {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [invoices, setInvoices] = useState<{ id: number; number: string; client: string; total: number; balance: number }[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<CreditNote[]>("/invoices/credit-notes"),
      api.get<any[]>("/invoices?status=sent,partially_paid,overdue").catch(() => []),
    ]).then(([notesData, invData]) => {
      setNotes(notesData);
      setInvoices(invData.map((i) => ({
        id: i.id,
        number: i.invoice_number ?? `INV-${i.id}`,
        client: i.client_name ?? "Unknown",
        total: Number(i.total),
        balance: Number(i.balance_due ?? i.total),
      })));
    }).catch(() => setNotes([]))
    .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter((n) =>
      n.note_number.toLowerCase().includes(q) ||
      n.invoice_number.toLowerCase().includes(q) ||
      n.client_name.toLowerCase().includes(q));
  }, [notes, search]);

  // Create form
  const [formInvoice, setFormInvoice] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formReason, setFormReason] = useState("");

  const selectedInvoice = useMemo(() => invoices.find((i) => i.number === formInvoice), [formInvoice, invoices]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInvoice) return;
    setSaving(true);
    try {
      const inv = invoices.find((i) => i.number === formInvoice);
      await api.post("/invoices/credit-notes", {
        invoiceId: inv?.id,
        amount: Number(formAmount),
        reason: formReason || undefined,
      });
      setCreateOpen(false);
      setFormInvoice(""); setFormAmount(""); setFormReason("");
      toastSuccess("Credit note created successfully");
      load();
    } catch {
      toastError("Failed to create credit note. Please try again.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    setDeleteConfirmId(null);
    try {
      await api.delete(`/invoices/credit-notes/${id}`);
      toastSuccess("Credit note deleted");
      load();
    } catch {
      toastError("Failed to delete credit note.");
    } finally { setDeleting(null); }
  };

  if (loading) return <CreditNotesLoading />;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        title="Credit Notes"
        subtitle="Manage credit notes issued against invoices"
        actions={<Button aria-label="Create Credit Note" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Credit Note</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Notes" value={notes.length} subtitle="all credit notes" icon={FileText} color="var(--chart-1)" index={0} />
        <KpiCard label="Total Amount" value={money(notes.reduce((sum, n) => sum + n.amount, 0))} subtitle="total credited" icon={Receipt} color="var(--chart-2)" index={1} />
        <KpiCard label="Issued Notes" value={notes.filter(n => n.status === "issued").length} subtitle="issued notes" icon={FileText} color="var(--shell-success)" index={2} />
        <KpiCard label="Issued Amount" value={money(notes.filter(n => n.status === "issued").reduce((sum, n) => sum + n.amount, 0))} subtitle="issued total" icon={Receipt} color="var(--chart-4)" index={3} />
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search credit notes..." className="max-w-xs" />

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title={notes.length === 0 ? "No credit notes yet" : "No credit notes match your search"} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Note #</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell><span className="font-mono text-xs font-medium">{n.note_number}</span></TableCell>
                    <TableCell className="font-mono text-xs">{n.invoice_number}</TableCell>
                    <TableCell className="text-[var(--shell-muted)]">{n.client_name}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(n.amount)}</TableCell>
                    <TableCell><Badge variant={statusVariant(n.status)} className="capitalize">{n.status}</Badge></TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">{n.date}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirmId(n.id)} disabled={deleting === n.id}>
                          {deleting === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-[--shell-danger]" />}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Credit Note</DialogTitle></DialogHeader>
          <form className="space-y-5" onSubmit={handleCreate}>
            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-[var(--shell-brand)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Invoice Reference</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cn-invoice">Invoice</Label>
                <Select value={formInvoice} onValueChange={(v) => v !== null && setFormInvoice(v)}>
                  <SelectTrigger id="cn-invoice"><SelectValue placeholder="Select an invoice" /></SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.number}>
                        {inv.number} — {inv.client} (Balance: {money(inv.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedInvoice && (
                <div className="mt-3 flex items-center justify-between rounded-md bg-[var(--shell-bg)] px-3 py-2 text-xs">
                  <span className="text-[var(--shell-muted)]">Invoice Balance</span>
                  <span className="font-mono font-semibold text-[var(--shell-brand)]">{money(selectedInvoice.balance)}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="space-y-2">
                <Label htmlFor="cn-amount">Amount (₹)</Label>
                <Input id="cn-amount" type="number" min={0.01} step={0.01} placeholder="0.00" required value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
              </div>
            </div>

            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="space-y-2">
                <Label htmlFor="cn-reason">Reason</Label>
                <Textarea id="cn-reason" rows={2} placeholder="Reason for credit note" value={formReason} onChange={(e) => setFormReason(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !formInvoice || !formAmount}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create Credit Note
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--shell-danger-surface)] text-[var(--shell-danger)]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle>Delete Credit Note</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-[--shell-muted] pt-1">
            Are you sure you want to delete this credit note? This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId !== null && handleDelete(deleteConfirmId)} disabled={deleting !== null}>
              {deleting !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
