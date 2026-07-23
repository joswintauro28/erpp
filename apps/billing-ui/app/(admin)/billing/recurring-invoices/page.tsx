"use client";

import { useState, useMemo, useEffect } from "react";
import { Repeat, Plus, Pause, Play, Trash2, Loader2, Building2, Calculator } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/shared/search-input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/services/api";
import { money } from "@/utils/format";
import type { RecurringInvoice } from "@/types/billing";
import RecurringInvoicesLoading from "./loading";

const frequencyColors: Record<string, string> = {
  weekly: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  monthly: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  quarterly: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  yearly: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

export default function RecurringInvoices() {
  const [items, setItems] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formClientId, setFormClientId] = useState("");
  const [formTemplate, setFormTemplate] = useState("");
  const [formInterval, setFormInterval] = useState("monthly");
  const [formNextRun, setFormNextRun] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formItems, setFormItems] = useState([{ product: "", quantity: 1, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);

  const liveTotal = useMemo(() =>
    formItems.reduce((s, item) => s + item.quantity * item.unit_price, 0),
  [formItems]);

  const loadData = () => {
    setLoading(true);
    api.get<RecurringInvoice[]>("/invoices/recurring")
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || formItems.length === 0) return;
    setSaving(true);
    try {
      await api.post("/invoices/recurring", {
        client_id: Number(formClientId),
        invoice_number: formTemplate || undefined,
        interval: formInterval,
        next_invoice_date: formNextRun || undefined,
        end_date: formEndDate || undefined,
        items: formItems.map((item) => ({ product: item.product, quantity: item.quantity, unit_price: item.unit_price })),
      });
      setCreateOpen(false);
      setFormClientId(""); setFormTemplate(""); setFormInterval("monthly"); setFormNextRun(""); setFormEndDate("");
      setFormItems([{ product: "", quantity: 1, unit_price: 0 }]);
      loadData();
    } catch {
      // handled by api interceptor
    } finally {
      setSaving(false);
    }
  };

  const addFormItem = () => setFormItems([...formItems, { product: "", quantity: 1, unit_price: 0 }]);
  const updateFormItem = (idx: number, field: string, value: any) => {
    setFormItems(formItems.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const removeFormItem = (idx: number) => {
    if (formItems.length > 1) setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const searched = q
      ? items.filter((r) =>
          r.invoice_number.toLowerCase().includes(q) ||
          r.client_name.toLowerCase().includes(q) ||
          r.frequency.toLowerCase().includes(q))
      : items;
    if (!statusFilter) return searched;
    return searched.filter((r) => r.status === statusFilter);
  }, [items, search, statusFilter]);

  const toggleStatus = async (id: number) => {
    const r = items.find((x) => x.id === id);
    if (!r) return;
    setToggling(id);
    const newStatus = r.status === "active" ? "paused" : "active";
    try {
      await api.put(`/invoices/recurring/${id}`, { status: newStatus });
      loadData();
    } catch {
      // handled by api interceptor
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await api.delete(`/invoices/recurring/${id}`);
      loadData();
    } catch {
      // handled by api interceptor
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <RecurringInvoicesLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">Recurring Invoices</h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Manage automated recurring billing schedules</p>
        </div>
        <Button aria-label="Create Schedule" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Schedule</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search recurring invoices..." className="flex-1 max-w-xs" />
        <Select value={statusFilter} onValueChange={(v) => v !== null && setStatusFilter(v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title={items.length === 0 ? "No recurring schedules yet" : "No schedules match your search"}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Last Generated</TableHead>
                  <TableHead>Auto Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><span className="font-mono text-xs font-medium">{r.invoice_number}</span></TableCell>
                    <TableCell className="text-[var(--shell-muted)]">{r.client_name}</TableCell>
                    <TableCell>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${frequencyColors[r.frequency] ?? "bg-gray-500/10 text-gray-500 border-gray-500/20"}`}>
                        {r.frequency}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">{r.next_run}</TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">{r.last_generated || "-"}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${r.auto_email ? "text-[var(--shell-success)]" : "text-[var(--shell-muted)]"}`}>
                        {r.auto_email ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "active" ? "default" : "secondary"} className="capitalize">{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => toggleStatus(r.id)}
                          disabled={toggling === r.id}
                          title={r.status === "active" ? "Pause" : "Resume"}
                        >
                          {toggling === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : r.status === "active" ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => handleDelete(r.id)}
                          disabled={deleting === r.id}
                          title="Delete"
                        >
                          {deleting === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 text-[var(--shell-danger)]" />
                          )}
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

      {/* Create Schedule Dialog — with live total and card layout */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Recurring Schedule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-[var(--shell-brand)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Schedule Details</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={formClientId} onValueChange={(v) => v !== null && setFormClientId(v)}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Client #1</SelectItem>
                      <SelectItem value="2">Client #2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input placeholder="e.g. Monthly Retainer" value={formTemplate} onChange={(e) => setFormTemplate(e.target.value)} />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={formInterval} onValueChange={(v) => v !== null && setFormInterval(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Next Run</Label>
                  <Input type="date" value={formNextRun} onChange={(e) => setFormNextRun(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--shell-accent)]/20 bg-[var(--shell-accent)]/5 p-3">
              <div className="flex items-center gap-2 text-xs text-[var(--shell-muted)]">
                <Calculator className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
                <span className="font-medium text-[var(--shell-foreground)]">{formItems.length} item{formItems.length > 1 ? "s" : ""}</span>
                <span className="mx-1.5 text-[var(--shell-border)]">|</span>
                <span>Estimated total: <strong className="text-[var(--shell-foreground)]">{money(liveTotal)}</strong></span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--shell-muted)]">Line Items</span>
                <Button type="button" variant="outline" size="sm" onClick={addFormItem}>
                  <Plus className="mr-1 h-3 w-3" /> Add Item
                </Button>
              </div>
              {formItems.map((item, idx) => (
                <div key={idx} className="flex items-end gap-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-3">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">Product / Service</Label>
                    <Input placeholder="Name" value={item.product} onChange={(e) => updateFormItem(idx, "product", e.target.value)} />
                  </div>
                  <div className="w-20 space-y-2">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => updateFormItem(idx, "quantity", Number(e.target.value))} />
                  </div>
                  <div className="w-28 space-y-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input type="number" min={0} step={0.01} value={item.unit_price} onChange={(e) => updateFormItem(idx, "unit_price", Number(e.target.value))} />
                  </div>
                  <div className="w-20 space-y-2">
                    <Label className="text-xs">Amount</Label>
                    <div className="flex h-9 items-center rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2 text-xs font-mono text-[var(--shell-foreground)]">
                      {money(item.quantity * item.unit_price)}
                    </div>
                  </div>
                  {formItems.length > 1 && (
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeFormItem(idx)} className="mb-0.5">×</Button>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
