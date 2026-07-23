"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Download, Edit, Trash2, ClipboardList, CheckSquare, AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { api } from "@/services/api";
import RequirementsLoading from "./loading";

const PRIORITY_OPTIONS = ["High", "Medium", "Low"] as const;
const STATUS_OPTIONS = ["Draft", "Submitted", "Approved"] as const;

const priorityVariant = (p: string) => {
  if (p === "High") return "destructive" as const;
  if (p === "Medium") return "secondary" as const;
  return "outline" as const;
};
const statusVariant = (s: string) => {
  if (s === "Draft") return "outline" as const;
  if (s === "Submitted") return "secondary" as const;
  return "default" as const;
};

type ReqForm = { name: string; category: string; account: string; priority: string; status: string };
const emptyForm: ReqForm = { name: "", category: "", account: "", priority: "Medium", status: "Draft" };

export default function RequirementsPage() {
  const [data, setData] = useState<any>({ requirements: [], summary: { total_requirements: 0, open: 0, overdue_at_risk: 0, owners: 0 } });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const r = await api.get<any>("/crm/requirements"); if (!cancelled) setData(r); }
      catch { if (!cancelled) setData({ requirements: [], summary: { total_requirements: 0, open: 0, overdue_at_risk: 0, owners: 0 } }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);
  const fetchData = async () => { try { setData(await api.get<any>("/crm/requirements")); } catch {} };

  const filtered = useMemo(() => {
    if (!search.trim()) return data.requirements;
    const q = search.toLowerCase();
    return data.requirements.filter((r: any) => r.name?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q));
  }, [data.requirements, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setStep(0); setDialogOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ name: r.name, category: r.category || "", account: r.account || "", priority: r.priority, status: r.status }); setStep(0); setDialogOpen(true); };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try { if (editing) await api.put(`/crm/requirements/${editing.id_str}`, form); else await api.post("/crm/requirements", form); await fetchData(); setDialogOpen(false); } catch {}
  };
  const handleDelete = async (idStr: string) => {
    try { await api.delete(`/crm/requirements/${idStr}`); setData((prev: any) => ({ ...prev, requirements: prev.requirements.filter((r: any) => r.id_str !== idStr), summary: { ...prev.summary, total_requirements: prev.summary.total_requirements - 1 } })); } catch {}
  };
  const updateField = (k: keyof ReqForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  if (loading) return <RequirementsLoading />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Requirements</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Track client requirements and approvals</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Requirement</Button>
      </div>
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Overview</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Requirements", value: String(data.summary?.total_requirements ?? 0), icon: ClipboardList, color: "var(--chart-1)" },
            { label: "Open", value: String(data.summary?.open ?? 0), icon: CheckSquare, color: "var(--chart-2)" },
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
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Records</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
            <Input placeholder="Search requirements..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export</Button>
        </div>
        <Card className="border-[--shell-border] bg-[--shell-surface]">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
                <ClipboardList className="h-12 w-12" />
                <p className="text-base font-medium text-[--shell-foreground]">{data.requirements.length === 0 ? "No requirements yet" : "No requirements match your search"}</p>
                <p className="text-sm">{data.requirements.length === 0 ? "Create your first requirement." : "Try adjusting your search."}</p>
                {data.requirements.length === 0 && <Button size="sm" onClick={openCreate} className="mt-2"><Plus className="mr-1 h-4 w-4" /> New Requirement</Button>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">ID</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Name</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Category</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Account</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Priority</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Status</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell><span className="font-mono text-xs text-[--shell-muted]">{r.id_str}</span></TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-[--shell-muted]">{r.category}</TableCell>
                      <TableCell>{r.account}</TableCell>
                      <TableCell><Badge variant={priorityVariant(r.priority)} className="text-[10px]">{r.priority}</Badge></TableCell>
                      <TableCell><Badge variant={statusVariant(r.status)} className="text-[10px]">{r.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(r.id_str)}><Trash2 className="h-3.5 w-3.5 text-[--shell-danger]" /></Button>
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
      <MultiStepDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Requirement" : "New Requirement"} steps={[{ title: "Details", description: "Requirement information" }, { title: "Priority", description: "Priority and status" }]} currentStep={step} onStepChange={setStep} onSubmit={handleSave} disableNext={!form.name.trim()} submitLabel={editing ? "Update Requirement" : "Create Requirement"}>
        {step === 0 && (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2"><Label htmlFor="r_name">Name</Label><Input id="r_name" value={form.name} onChange={(e) => updateField("name", e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="r_category">Category</Label><Input id="r_category" value={form.category} onChange={(e) => updateField("category", e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="r_account">Account</Label><Input id="r_account" value={form.account} onChange={(e) => updateField("account", e.target.value)} /></div>
          </div>
        )}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2"><Label htmlFor="r_priority">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => v !== null && updateField("priority", v)}>
                <SelectTrigger id="r_priority"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITY_OPTIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="r_status">Status</Label>
              <Select value={form.status} onValueChange={(v) => v !== null && updateField("status", v)}>
                <SelectTrigger id="r_status"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
