"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { FileText, Plus, Loader2, Trash2, Receipt } from "lucide-react";
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
import { money, noteStatusVariant as statusVariant } from "@/utils/format";
import type { DebitNote } from "@/types/billing";
import DebitNotesLoading from "./loading";

export default function DebitNotes() {
  const [notes, setNotes] = useState<DebitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

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
        invoice_id: inv?.id,
        amount: Number(formAmount),
        reason: formReason || undefined,
      });
      setCreateOpen(false);
      setFormInvoice(""); setFormAmount(""); setFormReason("");
      load();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await api.delete(`/invoices/debit-notes/${id}`);
      load();
    } catch { /* handled */ } finally { setDeleting(null); }
  };

  if (loading) return <DebitNotesLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">Debit Notes</h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Manage debit notes issued to clients</p>
        </div>
        <Button aria-label="Create Debit Note" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Debit Note</Button>
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
                    <TableCell className="text-[var(--shell-muted)]">{n.client_name}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(n.amount)}</TableCell>
                    <TableCell><Badge variant={statusVariant(n.status)} className="capitalize">{n.status}</Badge></TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">{n.date}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(n.id)} disabled={deleting === n.id}>
                          {deleting === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-[var(--shell-danger)]" />}
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
            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-[var(--shell-brand)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Invoice Reference</span>
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
                <div className="mt-3 flex items-center justify-between rounded-md bg-[var(--shell-bg)] px-3 py-2 text-xs">
                  <span className="text-[var(--shell-muted)]">Invoice Total</span>
                  <span className="font-mono font-semibold text-[var(--shell-foreground)]">{money(selectedInvoice.total)}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="space-y-2">
                <Label htmlFor="dn-amount">Amount (₹)</Label>
                <Input id="dn-amount" type="number" min={0.01} step={0.01} placeholder="0.00" required value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
              </div>
            </div>

            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
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
    </div>
  );
}
