"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, FileDown, Download, Trash2, Loader2, Plus, Receipt, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { searchBilling, money } from "@/utils/format";
import type { CreditNote } from "@/types/billing";
import { api } from "@/services/api";
import CreditNotesLoading from "./loading";

export default function CreditNotes() {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [invoices, setInvoices] = useState<{ id: number; number: string; total: number; balance: number; client: string }[]>([]);
  const [formInvoiceId, setFormInvoiceId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formReason, setFormReason] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedInvoice = useMemo(
    () => invoices.find((i) => String(i.id) === formInvoiceId),
    [formInvoiceId, invoices],
  );

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<CreditNote[]>("/invoices/credit-notes"),
      api.get<any[]>("/invoices").catch(() => []),
    ])
      .then(([data, invs]) => {
        setNotes(data);
        setInvoices(invs.map((i: any) => ({ id: i.id, number: i.invoice_number ?? `INV-${i.id}`, total: Number(i.total ?? 0), balance: Number(i.balance_due ?? i.total ?? 0), client: i.client_name ?? "" })));
      })
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInvoiceId || !formAmount) return;
    setSaving(true);
    try {
      await api.post("/invoices/credit-notes", {
        invoiceId: Number(formInvoiceId),
        amount: Number(formAmount),
        reason: formReason || undefined,
      });
      setCreateOpen(false);
      setFormInvoiceId(""); setFormAmount(""); setFormReason("");
      loadData();
    } catch {
      // handled by api interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this credit note?")) return;
    try {
      await api.delete(`/invoices/credit-notes/${id}`);
      loadData();
    } catch {
      // handled by api interceptor
    }
  };

  const filtered = useMemo(() => searchBilling(notes, search), [notes, search]);

  if (loading) {
    return <CreditNotesLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Credit Notes
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Credit notes issued against invoices
          </p>
        </div>
        <Button className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create Credit Note
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
          <Input
            placeholder="Search credit notes..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-[var(--shell-muted)]">
                <FileDown className="h-10 w-10" />
                <p className="text-sm">No credit notes found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Note #</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="font-mono text-xs font-medium">{n.note_number}</TableCell>
                      <TableCell className="font-mono text-xs">{n.invoice_number}</TableCell>
                      <TableCell>{n.client_name}</TableCell>
                      <TableCell className="text-xs text-[var(--shell-muted)]">{n.date}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{money(n.amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={n.status === "issued" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {n.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(n.id)}>
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

      {/* Create Credit Note Dialog — with invoice reference info */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Credit Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-[var(--shell-brand)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Reference Invoice</span>
              </div>
              <div className="space-y-2">
                <Label>Invoice</Label>
                <Select value={formInvoiceId} onValueChange={(v) => v !== null && setFormInvoiceId(v)}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={String(inv.id)}>
                        {inv.number} — {inv.client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedInvoice && (
                <div className="mt-3 grid grid-cols-2 gap-3 rounded-md bg-[var(--shell-bg)] p-3 text-xs">
                  <div>
                    <span className="text-[var(--shell-muted)]">Invoice Total</span>
                    <p className="font-mono font-medium text-[var(--shell-foreground)]">{money(selectedInvoice.total)}</p>
                  </div>
                  <div>
                    <span className="text-[var(--shell-muted)]">Balance Due</span>
                    <p className="font-mono font-medium text-[var(--shell-brand)]">{money(selectedInvoice.balance)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Credit Details</span>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input type="number" min={0.01} step={0.01} placeholder="0.00" required value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea rows={2} placeholder="Reason for credit note" value={formReason} onChange={(e) => setFormReason(e.target.value)} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white">
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create Credit Note
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
