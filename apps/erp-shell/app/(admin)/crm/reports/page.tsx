"use client";

import { useState, useEffect } from "react";
import { Plus, Download, Search, FileText, FileCheck, AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { api } from "@/services/api";
import ReportsLoading from "./loading";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Generating: "secondary", Processing: "secondary", Pending: "secondary",
  Completed: "default", Ready: "default", Success: "default",
  Failed: "destructive", Error: "destructive",
};

type ReportForm = { name: string; type: string };
const emptyForm: ReportForm = { name: "", type: "Summary" };

export default function ReportsPage() {
  const [data, setData] = useState<any>({ reports: [], summary: { total_reports: 0, open: 0, overdue_at_risk: 0, owners: 0 } });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const r = await api.get<any>("/crm/reports"); if (!cancelled) setData(r); }
      catch { if (!cancelled) setData({ reports: [], summary: { total_reports: 0, open: 0, overdue_at_risk: 0, owners: 0 } }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);
  const fetchData = async () => { try { setData(await api.get<any>("/crm/reports")); } catch {} };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ name: r.name || r.title, type: r.type || r.category }); setDialogOpen(true); };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try { if (editing) await api.put(`/crm/reports/${editing.id_str}`, form); else await api.post("/crm/reports", form); await fetchData(); setDialogOpen(false); } catch {}
  };
  const handleDelete = async (idStr: string) => {
    try { await api.delete(`/crm/reports/${idStr}`); setData((prev: any) => ({ ...prev, reports: prev.reports.filter((r: any) => r.id_str !== idStr), summary: { ...prev.summary, total_reports: prev.summary.total_reports - 1 } })); } catch {}
  };

  if (loading) return <ReportsLoading />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Reports</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Generate and manage business reports</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Report</Button>
      </div>
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Overview</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Reports", value: String(data.summary?.total_reports ?? 0), icon: FileText, color: "var(--chart-1)" },
            { label: "Generating", value: String(data.summary?.open ?? 0), icon: FileCheck, color: "var(--chart-2)" },
            { label: "Failed", value: String(data.summary?.overdue_at_risk ?? 0), icon: AlertTriangle, color: "var(--shell-danger)" },
            { label: "Owners", value: String(data.summary?.owners ?? 0), icon: Building2, color: "var(--chart-4)" },
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
              <Input placeholder="Search reports..." className="pl-8 h-9" />
            </div>
          </div>
          <CardContent className="p-0">
            {data.reports.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
                <FileText className="h-12 w-12" />
                <p className="text-base font-medium text-[--shell-foreground]">No reports yet</p>
                <p className="text-sm">Generate your first report.</p>
                <Button size="sm" onClick={openCreate} className="mt-2"><Plus className="mr-1 h-4 w-4" /> New Report</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">ID</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Name</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Type</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Generated</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Status</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.reports.map((r: any) => (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell><span className="font-mono text-xs text-[--shell-muted]">{r.id_str}</span></TableCell>
                      <TableCell className="font-medium">{r.name || r.title}</TableCell>
                      <TableCell className="text-[--shell-muted]">{r.type || r.category}</TableCell>
                      <TableCell className="text-[--shell-muted] text-xs">{r.date || r.last_run || r.generated_at}</TableCell>
                      <TableCell><Badge variant={statusVariant[r.status] || "outline"} className="text-[10px]">{r.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)}><FileText className="h-3.5 w-3.5" /></Button>
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
      <MultiStepDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Report" : "New Report"} steps={[{ title: "Details", description: "Report information" }]} currentStep={0} onStepChange={() => {}} onSubmit={handleSave} disableNext={!form.name.trim()} submitLabel={editing ? "Update Report" : "Create Report"}>
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2"><Label htmlFor="rp_name">Name</Label><Input id="rp_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="space-y-2"><Label htmlFor="rp_type">Type</Label><Input id="rp_type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></div>
        </div>
      </MultiStepDialog>
    </div>
  );
}
