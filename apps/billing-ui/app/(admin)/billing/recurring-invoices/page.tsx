"use client";

import { useState, useMemo, useEffect } from "react";
import { Repeat, Plus, Pause, Play, Trash2, Loader2, Building2, Calculator, AlertTriangle } from "lucide-react";
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
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";
import { money } from "@/utils/format";
import type { RecurringInvoice } from "@/types/billing";
import RecurringInvoicesLoading from "./loading";

const frequencyColors: Record<string, string> = {
  weekly: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  monthly: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  quarterly: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  yearly: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const GST_RATES = [0, 5, 12, 18, 28];

interface ClientRef {
  id: number;
  name: string;
}

export default function RecurringInvoices() {
  const { toast } = useToast();
  const [items, setItems] = useState<RecurringInvoice[]>([]);
  const [clients, setClients] = useState<ClientRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Form state — camelCase, matching CreateRecurringInvoiceDto
  const [formClientId, setFormClientId] = useState("");
  const [formInvoiceNumber, setFormInvoiceNumber] = useState("");
  const [formInterval, setFormInterval] = useState("monthly");
  const [formNextInvoiceDate, setFormNextInvoiceDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formAutoEmail, setFormAutoEmail] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState([{ description: "", quantity: 1, unitPrice: 0, gstRate: 18 }]);
  const [saving, setSaving] = useState(false);

  const liveTotal = useMemo(() =>
    formItems.reduce((s, item) => s + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0),
  [formItems]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<RecurringInvoice[]>("/invoices/recurring"),
      api.get<any[]>("/invoices"),
    ])
      .then(([recurring, invoices]) => {
        setItems(recurring);
        // Build distinct client list from invoices
        const seen = new Set<number>();
        const unique: ClientRef[] = [];
        for (const inv of invoices) {
          // API response is snake_case (via SnakeCaseInterceptor)
          const clientId = inv.client_id ?? inv.clientId;
          const clientName = inv.client_name ?? inv.clientName;
          if (clientId && !seen.has(clientId)) {
            seen.add(clientId);
            unique.push({ id: clientId, name: clientName ?? `Client #${clientId}` });
          }
        }
        setClients(unique);
      })
      .catch(() => { setItems([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setFormClientId(""); setFormInvoiceNumber(""); setFormInterval("monthly");
    setFormNextInvoiceDate(""); setFormEndDate(""); setFormAutoEmail(false);
    setFormNotes(""); setFormItems([{ description: "", quantity: 1, unitPrice: 0, gstRate: 18 }]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || formItems.length === 0) return;
    setSaving(true);
    const selectedClient = clients.find((c) => String(c.id) === formClientId);
    try {
      await api.post("/invoices/recurring", {
        clientId: Number(formClientId),
        clientName: selectedClient?.name ?? `Client #${formClientId}`,
        invoiceNumber: formInvoiceNumber || undefined,
        interval: formInterval,
        nextInvoiceDate: formNextInvoiceDate || undefined,
        endDate: formEndDate || undefined,
        autoEmail: formAutoEmail,
        notes: formNotes || undefined,
        items: formItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          gstRate: Number(item.gstRate) || 0,
        })),
      });
      setCreateOpen(false);
      resetForm();
      toast.success("Recurring schedule created successfully");
      loadData();
    } catch {
      toast.error("Failed to create recurring schedule. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addFormItem = () => setFormItems([...formItems, { description: "", quantity: 1, unitPrice: 0, gstRate: 18 }]);
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
      toast.success(`Schedule ${newStatus === "active" ? "resumed" : "paused"} successfully`);
      loadData();
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    setDeleteConfirmId(null);
    try {
      await api.delete(`/invoices/recurring/${id}`);
      toast.success("Recurring schedule deleted");
      loadData();
    } catch {
      toast.error("Failed to delete recurring schedule.");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <RecurringInvoicesLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Recurring Invoices</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Manage automated recurring billing schedules</p>
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
                    <TableCell className="text-[--shell-muted]">{r.client_name}</TableCell>
                    <TableCell>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${frequencyColors[r.frequency] ?? "bg-gray-500/10 text-gray-500 border-gray-500/20"}`}>
                        {r.frequency}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{r.next_run}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{r.last_generated || "-"}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${r.auto_email ? "text-[--shell-success]" : "text-[--shell-muted]"}`}>
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
                          onClick={() => setDeleteConfirmId(r.id)}
                          disabled={deleting === r.id}
                          title="Delete"
                        >
                          {deleting === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 text-[--shell-danger]" />
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

      {/* Create Schedule Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!saving) setCreateOpen(open); }}>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-80px)] p-0 overflow-hidden">
          <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
            <DialogTitle>Create Recurring Schedule</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form id="recurring-form" onSubmit={handleCreate} className="space-y-5">
              <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-[--shell-brand]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Schedule Details</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client <span className="text-[--shell-danger]">*</span></Label>
                    <Select value={formClientId} onValueChange={(v) => v !== null && setFormClientId(v)}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        {clients.length === 0 ? (
                          <SelectItem value="" disabled>No clients found</SelectItem>
                        ) : clients.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Template Name <span className="text-[--shell-muted] font-normal">(optional)</span></Label>
                    <Input placeholder="e.g. Monthly Retainer" value={formInvoiceNumber} onChange={(e) => setFormInvoiceNumber(e.target.value)} />
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
                    <Label>Next Run Date</Label>
                    <Input type="date" value={formNextInvoiceDate} onChange={(e) => setFormNextInvoiceDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <input
                    id="auto-email"
                    type="checkbox"
                    checked={formAutoEmail}
                    onChange={(e) => setFormAutoEmail(e.target.checked)}
                    className="h-4 w-4 rounded border-[--shell-border] cursor-pointer"
                  />
                  <Label htmlFor="auto-email" className="cursor-pointer font-normal text-sm">
                    Auto-send invoice to client via email when generated
                  </Label>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Notes</Label>
                  <Input placeholder="Optional notes..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
                </div>
              </div>

              <div className="rounded-lg border border-[--shell-accent]/20 bg-[--shell-accent]/5 p-3">
                <div className="flex items-center gap-2 text-xs text-[--shell-muted]">
                  <Calculator className="h-3.5 w-3.5 text-[--shell-accent]" />
                  <span className="font-medium text-[--shell-foreground]">{formItems.length} item{formItems.length > 1 ? "s" : ""}</span>
                  <span className="mx-1.5 text-[--shell-border]">|</span>
                  <span>Estimated total: <strong className="text-[--shell-foreground]">{money(liveTotal)}</strong></span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[--shell-muted]">Line Items</span>
                  <Button type="button" variant="outline" size="sm" onClick={addFormItem}>
                    <Plus className="mr-1 h-3 w-3" /> Add Item
                  </Button>
                </div>
                {formItems.map((item, idx) => (
                  <div key={idx} className="flex items-end gap-2 rounded-lg border border-[--shell-border] bg-[--shell-surface] p-3 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 space-y-2 min-w-[100px]">
                      <Label className="text-xs">Description <span className="text-[--shell-danger]">*</span></Label>
                      <Input placeholder="Product / Service" value={item.description} required onChange={(e) => updateFormItem(idx, "description", e.target.value)} />
                    </div>
                    <div className="w-20 space-y-2">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min={1} value={item.quantity} onChange={(e) => updateFormItem(idx, "quantity", Number(e.target.value))} />
                    </div>
                    <div className="w-28 space-y-2">
                      <Label className="text-xs">Unit Price</Label>
                      <Input type="number" min={0} step={0.01} value={item.unitPrice} onChange={(e) => updateFormItem(idx, "unitPrice", Number(e.target.value))} />
                    </div>
                    <div className="w-24 space-y-2">
                      <Label className="text-xs">GST %</Label>
                      <Select value={String(item.gstRate)} onValueChange={(v) => updateFormItem(idx, "gstRate", Number(v))}>
                        <SelectTrigger className="h-9 text-xs font-mono"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GST_RATES.map((r) => <SelectItem key={r} value={String(r)} className="font-mono">{r}%</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20 space-y-2">
                      <Label className="text-xs">Amount</Label>
                      <div className="flex h-9 items-center rounded-md border border-[--shell-border] bg-[--shell-bg] px-2 text-xs font-mono text-[--shell-foreground]">
                        {money((item.quantity || 0) * (item.unitPrice || 0))}
                      </div>
                    </div>
                    {formItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeFormItem(idx)} className="mb-0.5 shrink-0">
                        <Trash2 className="h-3.5 w-3.5 text-[--shell-danger]" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </form>
          </div>
          <DialogFooter className="shrink-0 border-t border-border bg-[--shell-surface] px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="recurring-form" disabled={saving || !formClientId}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Create Schedule
            </Button>
          </DialogFooter>
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
              <DialogTitle>Delete Recurring Schedule</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-[--shell-muted] pt-1">
            Are you sure you want to delete this recurring schedule? No future invoices will be generated. This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId !== null && handleDelete(deleteConfirmId)} disabled={deleting !== null}>
              {deleting !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
