"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search, Repeat, Play, Pause, Trash2, Loader2, Plus, Building2, Calculator,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { searchBilling, money } from "@/utils/format";
import { api } from "@/services/api";
import { handleError } from "@datavex/ui-theme";
import type { RecurringInvoice } from "@/types/billing";
import RecurringInvoicesLoading from "./loading";

const frequencyColors: Record<string, string> = {
  weekly: "var(--chart-1)",
  monthly: "var(--chart-2)",
  quarterly: "var(--chart-3)",
  yearly: "var(--chart-4)",
};

export default function RecurringInvoices() {
  const [recurring, setRecurring] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [formClientId, setFormClientId] = useState("");
  const [formTemplate, setFormTemplate] = useState("");
  const [formInterval, setFormInterval] = useState("monthly");
  const [formNextRun, setFormNextRun] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formItems, setFormItems] = useState([{ product: "", quantity: 1, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<any[]>("/invoices/recurring"),
      api.get<any[]>("/clients").catch(() => []),
    ])
      .then(([data, clientData]) => {
        setRecurring(data.map((r) => ({
          id: r.id,
          invoice_number: r.invoice_number,
          client_id: r.client_id,
          client_name: r.client_name,
          frequency: r.frequency,
          next_run: r.next_run ?? "",
          last_generated: r.last_generated ?? "",
          auto_email: r.auto_email,
          status: r.status === "paused" ? "paused" : "active",
        })));
        setClients(clientData.map((c: any) => ({ id: c.id, name: c.name })));
      })
      .catch(() => setRecurring([]))
      .finally(() => setLoading(false));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || formItems.length === 0) return;
    setSaving(true);
    try {
      // billing-service CreateRecurringInvoiceDto expects camelCase fields,
      // a required clientName, and items with description/unitPrice/gstRate.
      const clientName = clients.find((c) => c.id === Number(formClientId))?.name ?? `Client #${formClientId}`;
      await api.post("/invoices/recurring", {
        clientId: Number(formClientId),
        clientName,
        invoiceNumber: formTemplate || undefined,
        interval: formInterval,
        nextInvoiceDate: formNextRun || undefined,
        endDate: formEndDate || undefined,
        items: formItems.map((item) => ({
          description: item.product,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          gstRate: 18,
        })),
      });
      setCreateOpen(false);
      setCreateStep(0);
      setFormClientId(""); setFormTemplate(""); setFormInterval("monthly"); setFormNextRun(""); setFormEndDate("");
      setFormItems([{ product: "", quantity: 1, unit_price: 0 }]);
      loadData();
    } catch {
      // handled by api interceptor
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => setFormItems([...formItems, { product: "", quantity: 1, unit_price: 0 }]);
  const updateItem = (idx: number, field: string, value: any) => {
    setFormItems(formItems.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const removeItem = (idx: number) => {
    if (formItems.length > 1) setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const liveTotal = useMemo(() =>
    formItems.reduce((s, item) => s + item.quantity * item.unit_price, 0),
  [formItems]);

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => searchBilling(recurring, search), [recurring, search]);

  const toggleStatus = async (id: number) => {
    const r = recurring.find((x) => x.id === id);
    if (!r) return;
    const newStatus = r.status === "active" ? "paused" : "active";
    try {
      await api.put(`/invoices/recurring/${id}`, { status: newStatus });
      loadData();
    } catch {
      // handled by api interceptor
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/invoices/recurring/${id}`);
      loadData();
    } catch {
      // handled by api interceptor
    }
  };

  if (loading) {
    return <RecurringInvoicesLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Recurring Invoices
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Manage automated recurring invoice schedules
          </p>
        </div>
        <Button className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create Schedule
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
          <Input
            placeholder="Search recurring invoices..."
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
              <Repeat className="h-10 w-10" />
              <p className="text-sm">No recurring schedules found</p>
            </div>
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
                    <TableCell className="font-mono text-xs font-medium">{r.invoice_number}</TableCell>
                    <TableCell>{r.client_name}</TableCell>
                    <TableCell>
                      <Badge
                        className="capitalize"
                        style={{
                          backgroundColor: frequencyColors[r.frequency],
                          color: "white",
                          borderColor: frequencyColors[r.frequency],
                        }}
                      >
                        {r.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">{r.next_run}</TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">{r.last_generated}</TableCell>
                    <TableCell>
                      {r.auto_email ? (
                        <span className="text-xs text-[var(--shell-success)]">Yes</span>
                      ) : (
                        <span className="text-xs text-[var(--shell-muted)]">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.status === "active" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => toggleStatus(r.id)}
                          title={r.status === "active" ? "Pause" : "Resume"}
                        >
                          {r.status === "active" ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(r.id)} title="Delete">
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

      {/* Create Schedule — MultiStepDialog with live total */}
      <MultiStepDialog
        open={createOpen}
        onOpenChange={(v) => { if (!v) { setCreateStep(0); setCreateOpen(v); } }}
        title="Create Recurring Schedule"
        steps={[
          { title: "Schedule", description: "Client, frequency, and schedule settings" },
          { title: "Items", description: "Add line items for the recurring invoice" },
        ]}
        currentStep={createStep}
        onStepChange={setCreateStep}
        onSubmit={handleCreate}
        submitLabel="Create Schedule"
        isSubmitting={saving}
      >
        {createStep === 0 && (
          <div className="space-y-5">
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
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
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
          </div>
        )}
        {createStep === 1 && (
          <div className="space-y-5">
            <div className="rounded-lg border border-[var(--shell-accent)]/20 bg-[var(--shell-accent)]/5 p-3">
              <div className="flex items-center gap-2 text-xs text-[var(--shell-muted)]">
                <Calculator className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
                <span className="font-medium text-[var(--shell-foreground)]">{formItems.length} item{formItems.length > 1 ? "s" : ""}</span>
                <span className="mx-1.5 text-[var(--shell-border)]">|</span>
                <span>Estimated total: <strong className="text-[var(--shell-foreground)]">{money(liveTotal)}</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--shell-muted)]">Line Items</span>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" /> Add Item
              </Button>
            </div>
            {formItems.map((item, idx) => (
              <div key={idx} className="flex items-end gap-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Product / Service</Label>
                  <Input placeholder="Name" value={item.product} onChange={(e) => updateItem(idx, "product", e.target.value)} />
                </div>
                <div className="w-20 space-y-2">
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} />
                </div>
                <div className="w-28 space-y-2">
                  <Label className="text-xs">Unit Price</Label>
                  <Input type="number" min={0} step={0.01} value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} />
                </div>
                <div className="w-20 space-y-2">
                  <Label className="text-xs">Amount</Label>
                  <div className="flex h-9 items-center rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2 text-xs font-mono text-[var(--shell-foreground)]">
                    {money(item.quantity * item.unit_price)}
                  </div>
                </div>
                {formItems.length > 1 && (
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeItem(idx)} className="mb-0.5">×</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
