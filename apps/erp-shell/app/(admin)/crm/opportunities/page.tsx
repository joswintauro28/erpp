"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Download, Edit, Trash2, TrendingUp, Target, AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { api } from "@/services/api";
import OpportunitiesLoading from "./loading";

const STAGE_OPTIONS = ["Discovery", "Proposal", "Negotiation", "Won", "Lost"] as const;

const stageVariant = (s: string) => {
  if (s === "Discovery") return "secondary" as const;
  if (s === "Proposal") return "outline" as const;
  if (s === "Negotiation" || s === "Won") return "default" as const;
  return "destructive" as const;
};

type OppForm = { name: string; account: string; value: number; probability: string; close_date: string; stage: string };
const emptyForm: OppForm = { name: "", account: "", value: 0, probability: "50%", close_date: "", stage: "Discovery" };

export default function OpportunitiesPage() {
  const [data, setData] = useState<any>({ opportunities: [], summary: { total_opportunities: 0, open: 0, overdue_at_risk: 0, owners: 0 } });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const r = await api.get<any>("/crm/opportunities"); if (!cancelled) setData(r); }
      catch { if (!cancelled) setData({ opportunities: [], summary: { total_opportunities: 0, open: 0, overdue_at_risk: 0, owners: 0 } }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchData = async () => { try { setData(await api.get<any>("/crm/opportunities")); } catch {} };

  const filtered = useMemo(() => {
    if (!search.trim()) return data.opportunities;
    const q = search.toLowerCase();
    return data.opportunities.filter((o: any) => o.name?.toLowerCase().includes(q) || o.account?.toLowerCase().includes(q));
  }, [data.opportunities, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setStep(0); setDialogOpen(true); };
  const openEdit = (o: any) => {
    setEditing(o); setForm({ name: o.name, account: o.account || "", value: o.value || 0, probability: o.probability || "50%", close_date: o.close_date || "", stage: o.stage || "Discovery" });
    setStep(0); setDialogOpen(true);
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/crm/opportunities/${editing.id_str}`, form);
      else await api.post("/crm/opportunities", form);
      await fetchData(); setDialogOpen(false);
    } catch {}
  };
  const handleDelete = async (idStr: string) => {
    try { await api.delete(`/crm/opportunities/${idStr}`); setData((prev: any) => ({ ...prev, opportunities: prev.opportunities.filter((o: any) => o.id_str !== idStr), summary: { ...prev.summary, total_opportunities: prev.summary.total_opportunities - 1 } })); } catch {}
  };
  const updateField = (k: keyof OppForm, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  if (loading) return <OpportunitiesLoading />;

  const fmt = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Opportunities</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Manage your sales pipeline deals</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Opportunity</Button>
      </div>
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Overview</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Opportunities", value: String(data.summary?.total_opportunities ?? 0), icon: TrendingUp, color: "var(--chart-1)" },
            { label: "Open", value: String(data.summary?.open ?? 0), icon: Target, color: "var(--chart-2)" },
            { label: "Overdue / At Risk", value: String(data.summary?.overdue_at_risk ?? 0), icon: AlertTriangle, color: "var(--shell-danger)" },
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
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Deals</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
            <Input placeholder="Search opportunities..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export</Button>
        </div>
        <Card className="border-[--shell-border] bg-[--shell-surface]">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
                <Target className="h-12 w-12" />
                <p className="text-base font-medium text-[--shell-foreground]">{data.opportunities.length === 0 ? "No opportunities yet" : "No deals match your search"}</p>
                <p className="text-sm">{data.opportunities.length === 0 ? "Create your first opportunity." : "Try adjusting your search."}</p>
                {data.opportunities.length === 0 && <Button size="sm" onClick={openCreate} className="mt-2"><Plus className="mr-1 h-4 w-4" /> New Opportunity</Button>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">ID</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Deal</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Account</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Value</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Probability</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Close Date</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Stage</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o: any) => (
                    <TableRow key={o.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell><span className="font-mono text-xs text-[--shell-muted]">{o.id_str}</span></TableCell>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell className="text-[--shell-muted]">{o.account}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{fmt(o.value)}</TableCell>
                      <TableCell>{o.probability}</TableCell>
                      <TableCell className="text-[--shell-muted] text-xs">{o.close_date}</TableCell>
                      <TableCell><Badge variant={stageVariant(o.stage)} className="text-[10px]">{o.stage}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(o)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(o.id_str)}><Trash2 className="h-3.5 w-3.5 text-[--shell-danger]" /></Button>
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
      <MultiStepDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Opportunity" : "New Opportunity"} steps={[{ title: "Details", description: "Deal information" }, { title: "Pipeline", description: "Stage and close details" }]} currentStep={step} onStepChange={setStep} onSubmit={handleSave} disableNext={!form.name.trim()} submitLabel={editing ? "Update Opportunity" : "Create Opportunity"}>
        {step === 0 && (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2"><Label htmlFor="o_name">Deal Name</Label><Input id="o_name" value={form.name} onChange={(e) => updateField("name", e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="o_account">Account</Label><Input id="o_account" value={form.account} onChange={(e) => updateField("account", e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="o_value">Value (₹)</Label><Input id="o_value" type="number" min={0} value={form.value} onChange={(e) => updateField("value", Number(e.target.value))} /></div>
          </div>
        )}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2"><Label htmlFor="o_stage">Stage</Label>
              <Select value={form.stage} onValueChange={(v) => v !== null && updateField("stage", v)}>
                <SelectTrigger id="o_stage"><SelectValue /></SelectTrigger>
                <SelectContent>{STAGE_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="o_prob">Probability</Label><Input id="o_prob" value={form.probability} onChange={(e) => updateField("probability", e.target.value)} placeholder="e.g. 50%" /></div>
            <div className="space-y-2"><Label htmlFor="o_close">Close Date</Label><Input id="o_close" type="date" value={form.close_date} onChange={(e) => updateField("close_date", e.target.value)} /></div>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
