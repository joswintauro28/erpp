"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { ClipboardList, Plus, Loader2, X, DollarSign } from "lucide-react";
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
import { money, quotationStatusVariant as statusVariant } from "@/utils/format";
import type { Quotation } from "@/types/billing";
import QuotationsLoading from "./loading";

const statusOptions = ["draft", "sent", "accepted", "rejected", "expired"];

export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

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

  // Create form
  const [formClient, setFormClient] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState([{ description: "", quantity: 1, unitPrice: 0, gstRate: 18 }]);

  const lineTotals = useMemo(() =>
    formItems.map((item) => (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
    [formItems]);

  const grandTotal = useMemo(() => lineTotals.reduce((s, v) => s + v, 0), [lineTotals]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/invoices/quotations", {
        client_name: formClient,
        valid_until: formValidUntil || undefined,
        notes: formNotes || undefined,
        items: formItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unitPrice) || 0,
          gst_rate: Number(item.gstRate) || 0,
        })),
      });
      setCreateOpen(false);
      setFormClient(""); setFormValidUntil(""); setFormNotes(""); setFormItems([{ description: "", quantity: 1, unitPrice: 0, gstRate: 18 }]);
      load();
    } catch { /* handled */ } finally { setSaving(false); }
  };

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

  if (loading) return <QuotationsLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Quotations</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Create and manage client quotations</p>
        </div>
        <Button aria-label="Create Quotation" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Quotation</Button>
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
                    <TableCell><span className="font-mono text-xs font-medium">{qt.quote_number}</span></TableCell>
                    <TableCell className="text-[--shell-muted]">{qt.client_name}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(qt.total)}</TableCell>
                    <TableCell><Badge variant={statusVariant(qt.status)} className="capitalize">{qt.status}</Badge></TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{qt.issue_date}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{qt.valid_until}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {qt.status === "draft" && (
                          <Button variant="ghost" size="icon-sm" onClick={() => handleStatusChange(qt.id, "sent")} disabled={actionLoading === qt.id}>
                            {actionLoading === qt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="text-[10px] font-semibold">Send</span>}
                          </Button>
                        )}
                        {qt.status === "accepted" && !qt.converted_invoice_id && (
                          <Button variant="ghost" size="icon-sm" onClick={() => handleConvert(qt.id)} disabled={actionLoading === qt.id}>
                            {actionLoading === qt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="text-[10px] font-semibold">Convert</span>}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Create Quotation</DialogTitle></DialogHeader>
          <form className="space-y-5" onSubmit={handleCreate}>
            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5 text-[--shell-brand]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Quote Details</span>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="q-client">Client Name</Label>
                  <Input id="q-client" placeholder="Client name" required value={formClient} onChange={(e) => setFormClient(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="q-valid">Valid Until</Label>
                    <Input id="q-valid" type="date" value={formValidUntil} onChange={(e) => setFormValidUntil(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-[--shell-accent]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Line Items</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setFormItems([...formItems, { description: "", quantity: 1, unitPrice: 0, gstRate: 18 }])}>
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {formItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 rounded-md border border-[--shell-border] bg-[--shell-bg] p-3">
                    <div className="flex-1 space-y-2">
                      <Input placeholder="Description" value={item.description} onChange={(e) => {
                        const next = [...formItems]; next[idx] = { ...next[idx], description: e.target.value }; setFormItems(next);
                      }} />
                    </div>
                    <div className="w-20 space-y-2">
                      <Input type="number" min={0.01} step={1} placeholder="Qty" value={item.quantity} onChange={(e) => {
                        const next = [...formItems]; next[idx] = { ...next[idx], quantity: Number(e.target.value) || 0 }; setFormItems(next);
                      }} />
                    </div>
                    <div className="w-24 space-y-2">
                      <Input type="number" min={0} step={0.01} placeholder="Price" value={item.unitPrice} onChange={(e) => {
                        const next = [...formItems]; next[idx] = { ...next[idx], unitPrice: Number(e.target.value) || 0 }; setFormItems(next);
                      }} />
                    </div>
                    <div className="w-16 space-y-2">
                      <Input type="number" min={0} max={100} step={0.1} placeholder="GST%" value={item.gstRate} onChange={(e) => {
                        const next = [...formItems]; next[idx] = { ...next[idx], gstRate: Number(e.target.value) || 0 }; setFormItems(next);
                      }} />
                    </div>
                    <div className="w-20 pt-6 text-right">
                      <span className="font-mono text-xs font-semibold">{money((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</span>
                    </div>
                    {formItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-sm" className="pt-6" onClick={() => setFormItems(formItems.filter((_, i) => i !== idx))}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="space-y-2">
                <Label htmlFor="q-notes">Notes</Label>
                <Textarea id="q-notes" rows={2} placeholder="Optional notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[--shell-border] bg-[--shell-surface] px-4 py-3">
              <span className="text-sm font-semibold text-[--shell-foreground]">Estimated Total</span>
              <span className="font-heading text-lg font-bold text-[--shell-brand]">{money(grandTotal)}</span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !formClient || formItems.length === 0 || formItems.every((i) => !i.description)}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create Quotation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
