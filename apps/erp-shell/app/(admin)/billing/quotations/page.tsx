"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, FileText, Edit, Trash2, CheckCircle, XCircle,
  Send, ClipboardList, Loader2,
} from "lucide-react";
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
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { searchBilling, money, statusVariant } from "@/utils/format";
import type { Quotation } from "@/types/billing";
import { api } from "@/services/api";
import QuotationsLoading from "./loading";

const statusOptions = ["", "draft", "sent", "accepted", "rejected", "expired"] as const;


interface ClientRef {
  id: number;
  name: string;
}

const emptyForm = { client_id: 0, total: 0, notes: "" };

export default function Quotations() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<ClientRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [qData, cData] = await Promise.all([
          api.get<Quotation[]>("/invoices/quotations"),
          api.get<ClientRef[]>("/clients"),
        ]);
        setQuotes(qData);
        setClients(cData);
      } catch (err) {
        console.error("Failed to load quotations data", err);
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

  const openCreate = () => {
    setEditing(null);
    setForm({
      client_id: clients[0]?.id || 0,
      total: 0,
      notes: "",
    });
    setStep(0);
    setDialogOpen(true);
  };

  const openEdit = (q: Quotation) => {
    setEditing(q);
    setForm({ client_id: q.client_id, total: q.total, notes: q.notes });
    setStep(0);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const updated = await api.put<Quotation>(`/invoices/quotations/${editing.id}`, form);
        setQuotes((prev) =>
          prev.map((q) => q.id === editing.id ? updated : q)
        );
      } else {
        const created = await api.post<Quotation>("/invoices/quotations", form);
        setQuotes((prev) => [created, ...prev]);
      }
      setDialogOpen(false);
    } catch (err) {
      console.error("Failed to save quotation", err);
    }
  };

  const updateStatus = async (id: number, status: Quotation["status"]) => {
    try {
      const updated = await api.put<Quotation>(`/invoices/quotations/${id}/status?status=${status}`);
      setQuotes((prev) => prev.map((q) => q.id === id ? updated : q));
    } catch (err) {
      console.error("Failed to update status", err);
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
      console.error("Failed to convert quotation", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await api.delete(`/invoices/quotations/${id}`);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      console.error("Failed to delete quotation", err);
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
        <Button onClick={openCreate} disabled={clients.length === 0}>
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

      <MultiStepDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Quotation" : "Create Quotation"}
        steps={[
          { title: "Details", description: "Client and amount" },
          { title: "Notes", description: "Additional information" },
        ]}
        currentStep={step}
        onStepChange={setStep}
        onSubmit={handleSave}
        disableNext={step === 0 && (!form.client_id || form.total <= 0)}
        submitLabel={editing ? "Update Quotation" : "Create Quotation"}
      >
        {step === 0 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="q-client" className="text-[var(--shell-muted)]">Client</Label>
              <Select
                value={String(form.client_id)}
                onValueChange={(v) => setForm({ ...form, client_id: Number(v) })}
              >
                <SelectTrigger id="q-client" className="h-9">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-total" className="text-[var(--shell-muted)]">Total Amount</Label>
              <Input id="q-total" type="number" min={0} value={form.total}
                onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} required />
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="q-notes" className="text-[var(--shell-muted)]">Notes</Label>
            <Textarea id="q-notes" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3} />
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
