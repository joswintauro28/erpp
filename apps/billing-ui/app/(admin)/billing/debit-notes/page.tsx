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
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";
import { money, noteStatusVariant as statusVariant } from "@/utils/format";
import type { DebitNote } from "@/types/billing";
import DebitNotesLoading from "./loading";

export default function DebitNotes() {
  const { toast } = useToast();
  const [notes, setNotes] = useState<DebitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [invoices, setInvoices] = useState<{ id: number; number: string; client: string; total: number }[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<DebitNote[]>("/invoices/debit-notes"),
      api.get<any[]>("/invoices").catch(() => []),
    ]).then(([notesData, invData]) => {
      setNotes(notesData);
      setInvoices(invData.map((i) => ({
        id: i.id,
        number: i.invoice_number ?? `INV-${i.id}`,
        client: i.client_name ?? "Unknown",
        total: Number(i.total),
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
      await api.post("/invoices/debit-notes", {
        invoiceId: inv?.id,
        amount: Number(formAmount),
        reason: formReason || undefined,
      });
      setCreateOpen(false);
      setFormInvoice(""); setFormAmount(""); setFormReason("");
      toast.success("Debit note created successfully");
      load();
    } catch {
      toast.error("Failed to create debit note. Please try again.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    setDeleteConfirmId(null);
    try {
      await api.delete(`/invoices/debit-notes/${id}`);
      toast.success("Debit note deleted");
      load();
    } catch {
      toast.error("Failed to delete debit note.");
    } finally { setDeleting(null); }
  };

  if (loading) return <DebitNotesLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Debit Notes</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Manage debit notes issued to clients</p>
        </div>
        <Button aria-label="Create Debit Note" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Debit Note</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[--chart-1]/10"><FileText className="h-4 w-4 text-[--chart-1]" /></div>
          <div className="min-w-0"><p className="font-heading text-base font-semibold leading-tight">{notes.length}</p><p className="text-[11px] font-medium text-[--shell-muted] leading-tight mt-0.5">Total Notes</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[--chart-2]/10"><Receipt className="h-4 w-4 text-[--chart-2]" /></div>
          <div className="min-w-0"><p className="font-heading text-base font-semibold leading-tight">{money(notes.reduce((sum, n) => sum + n.amount, 0))}</p><p className="text-[11px] font-medium text-[--shell-muted] leading-tight mt-0.5">Total Amount</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[--shell-success]/10"><FileText className="h-4 w-4 text-[--shell-success]" /></div>
          <div className="min-w-0"><p className="font-heading text-base font-semibold leading-tight">{notes.filter(n => n.status === "issued").length}</p><p className="text-[11px] font-medium text-[--shell-muted] leading-tight mt-0.5">Issued Notes</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[--chart-4]/10"><Receipt className="h-4 w-4 text-[--chart-4]" /></div>
          <div className="min-w-0"><p className="font-heading text-base font-semibold leading-tight">{money(notes.filter(n => n.status === "issued").reduce((sum, n) => sum + n.amount, 0))}</p><p className="text-[11px] font-medium text-[--shell-muted] leading-tight mt-0.5">Issued Amount</p></div>
        </CardContent></Card>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search debit notes..." className="max-w-xs" />

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title={notes.length === 0 ? "No debit notes yet" : "No debit notes match your search"} />
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
                    <TableCell className="text-[--shell-muted]">{n.client_name}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(n.amount)}</TableCell>
                    <TableCell><Badge variant={statusVariant(n.status)} className="capitalize">{n.status}</Badge></TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{n.date}</TableCell>
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
          <DialogHeader><DialogTitle>Create Debit Note</DialogTitle></DialogHeader>
          <form className="space-y-5" onSubmit={handleCreate}>
            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-[--shell-brand]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Invoice Reference</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dn-invoice">Invoice</Label>
                <Select value={formInvoice} onValueChange={(v) => v !== null && setFormInvoice(v)}>
                  <SelectTrigger id="dn-invoice"><SelectValue placeholder="Select an invoice" /></SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.number}>
                        {inv.number} — {inv.client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedInvoice && (
                <div className="mt-3 flex items-center justify-between rounded-md bg-[--shell-bg] px-3 py-2 text-xs">
                  <span className="text-[--shell-muted]">Invoice Total</span>
                  <span className="font-mono font-semibold text-[--shell-foreground]">{money(selectedInvoice.total)}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="space-y-2">
                <Label htmlFor="dn-amount">Amount (₹)</Label>
                <Input id="dn-amount" type="number" min={0.01} step={0.01} placeholder="0.00" required value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
              </div>
            </div>

            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="space-y-2">
                <Label htmlFor="dn-reason">Reason</Label>
                <Textarea id="dn-reason" rows={2} placeholder="Reason for debit note" value={formReason} onChange={(e) => setFormReason(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !formInvoice || !formAmount}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create Debit Note
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
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle>Delete Debit Note</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-[--shell-muted] pt-1">
            Are you sure you want to delete this debit note? This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
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
