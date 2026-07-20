"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Download, Edit, Trash2, CheckCircle, FileText, FileCheck, AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { api } from "@/services/api";
import QuotationsLoading from "./loading";

const STATUS_OPTIONS = ["Draft", "Sent", "Under Review", "Accepted", "Rejected", "Expired"] as const;

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Draft: "outline", Sent: "secondary", "Under Review": "secondary",
  Accepted: "default", Rejected: "destructive", Expired: "destructive",
};

const fmt = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

type QuoteForm = { quote_no: string; account: string; value: number; valid_until: string; status: string };
const emptyForm: QuoteForm = { quote_no: "", account: "", value: 0, valid_until: "", status: "Draft" };

export default function QuotationsPage() {
  const [data, setData] = useState<any>({ quotations: [], summary: { total_quotations: 0, open: 0, overdue_at_risk: 0, owners: 0 } });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const r = await api.get<any>("/crm/quotations"); if (!cancelled) setData(r); }
      catch { if (!cancelled) setData({ quotations: [], summary: { total_quotations: 0, open: 0, overdue_at_risk: 0, owners: 0 } }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);
  const fetchData = async () => { try { setData(await api.get<any>("/crm/quotations")); } catch {} };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setStep(0); setDialogOpen(true); };
  const openEdit = (q: any) => { setEditing(q); setForm({ quote_no: q.quote_no, account: q.account || "", value: q.value || 0, valid_until: q.valid_until || "", status: q.status }); setStep(0); setDialogOpen(true); };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try { if (editing) await api.put(`/crm/quotations/${editing.id_str}`, form); else await api.post("/crm/quotations", form); await fetchData(); setDialogOpen(false); } catch {}
  };
  const handleDelete = async (idStr: string) => {
    try { await api.delete(`/crm/quotations/${idStr}`); setData((prev: any) => ({ ...prev, quotations: prev.quotations.filter((q: any) => q.id_str !== idStr), summary: { ...prev.summary, total_quotations: prev.summary.total_quotations - 1 } })); } catch {}
  };
  const updateField = (k: keyof QuoteForm, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  if (loading) return <QuotationsLoading />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Quotations</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Create and manage sales quotations</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Quotation</Button>
      </div>
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Overview</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Quotations", value: String(data.summary?.total_quotations ?? 0), icon: FileText, color: "var(--chart-1)" },
            { label: "Open", value: String(data.summary?.open ?? 0), icon: FileCheck, color: "var(--chart-2)" },
            { label: "Needs Attention", value: String(data.summary?.overdue_at_risk ?? 0), icon: AlertTriangle, color: "var(--shell-danger)" },
            { label: "Representatives", value: String(data.summary?.owners ?? 0), icon: Building2, color: "var(--chart-4)" },
          ].map((kpi, i) => (
            <div key={kpi.label} className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[--shell-border] bg-[--shell-surface] p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">{kpi.label}</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[--shell-border] bg-[--shell-bg]">
                  <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                </div>
              </div>
              <span className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{kpi.value}</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Records</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export</Button>
        </div>
        <Card className="border-[--shell-border] bg-[--shell-surface]">
          <div className="flex items-center gap-3 p-4 border-b border-[--shell-border]">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
              <Input placeholder="Search quotations..." className="pl-8 h-9" />
            </div>
          </div>
          <CardContent className="p-0">
            {data.quotations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
                <FileText className="h-12 w-12" />
                <p className="text-base font-medium text-[--shell-foreground]">No quotations yet</p>
                <p className="text-sm">Create your first quotation.</p>
                <Button size="sm" onClick={openCreate} className="mt-2"><Plus className="mr-1 h-4 w-4" /> New Quotation</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">ID</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Quote #</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Account</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Value</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Valid Until</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Status</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.quotations.map((q: any) => (
                    <TableRow key={q.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell><span className="font-mono text-xs text-[--shell-muted]">{q.id_str}</span></TableCell>
                      <TableCell className="font-medium">{q.quote_no}</TableCell>
                      <TableCell className="text-[--shell-muted]">{q.account}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{fmt(q.value)}</TableCell>
                      <TableCell className="text-[--shell-muted] text-xs">{q.valid_until}</TableCell>
                      <TableCell><Badge variant={statusVariant[q.status] || "outline"} className="text-[10px]">{q.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(q)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(q.id_str)}><Trash2 className="h-3.5 w-3.5 text-[--shell-danger]" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
      <MultiStepDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Quotation" : "New Quotation"} steps={[{ title: "Details", description: "Quote information" }, { title: "Pricing", description: "Value and validity" }]} currentStep={step} onStepChange={setStep} onSubmit={handleSave} disableNext={!form.quote_no.trim()} submitLabel={editing ? "Update Quotation" : "Create Quotation"}>
        {step === 0 && (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2"><Label htmlFor="q_no">Quote #</Label><Input id="q_no" value={form.quote_no} onChange={(e) => updateField("quote_no", e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="q_account">Account</Label><Input id="q_account" value={form.account} onChange={(e) => updateField("account", e.target.value)} /></div>
          </div>
        )}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2"><Label htmlFor="q_value">Value (₹)</Label><Input id="q_value" type="number" min={0} value={form.value} onChange={(e) => updateField("value", Number(e.target.value))} /></div>
            <div className="space-y-2"><Label htmlFor="q_valid">Valid Until</Label><Input id="q_valid" type="date" value={form.valid_until} onChange={(e) => updateField("valid_until", e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="q_status">Status</Label>
              <Select value={form.status} onValueChange={(v) => v !== null && updateField("status", v)}>
                <SelectTrigger id="q_status"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
