"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Download, Edit, Trash2, FileText, FileCheck, AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { api } from "@/services/api";
import DocumentsLoading from "./loading";

const STATUS_OPTIONS = ["Draft", "Under Review", "Signed", "Expired"] as const;

const statusVariant = (s: string) => {
  if (s === "Draft") return "outline" as const;
  if (s === "Under Review") return "secondary" as const;
  if (s === "Signed") return "default" as const;
  return "destructive" as const;
};

type DocumentForm = { title: string; type: string; account: string; status: string };
const emptyForm: DocumentForm = { title: "", type: "Contract", account: "", status: "Draft" };

export default function DocumentsPage() {
  const [data, setData] = useState<any>({ documents: [], summary: { total_documents: 0, open: 0, overdue_at_risk: 0, owners: 0 } });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const r = await api.get<any>("/crm/documents"); if (!cancelled) setData(r); }
      catch { if (!cancelled) setData({ documents: [], summary: { total_documents: 0, open: 0, overdue_at_risk: 0, owners: 0 } }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchData = async () => { try { setData(await api.get<any>("/crm/documents")); } catch {} };

  const filtered = useMemo(() => {
    if (!search.trim()) return data.documents;
    const q = search.toLowerCase();
    return data.documents.filter((d: any) => d.title?.toLowerCase().includes(q) || d.type?.toLowerCase().includes(q));
  }, [data.documents, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setStep(0); setDialogOpen(true); };
  const openEdit = (d: any) => { setEditing(d); setForm({ title: d.title, type: d.type, account: d.account || "", status: d.status }); setStep(0); setDialogOpen(true); };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/crm/documents/${editing.id_str}`, form);
      else await api.post("/crm/documents", form);
      await fetchData(); setDialogOpen(false);
    } catch {}
  };
  const handleDelete = async (idStr: string) => {
    try { await api.delete(`/crm/documents/${idStr}`); setData((prev: any) => ({ ...prev, documents: prev.documents.filter((d: any) => d.id_str !== idStr), summary: { ...prev.summary, total_documents: prev.summary.total_documents - 1 } })); } catch {}
  };
  const updateField = (k: keyof DocumentForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  if (loading) return <DocumentsLoading />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Documents</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Document library across all accounts</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Document</Button>
      </div>
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Overview</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Documents", value: String(data.summary?.total_documents ?? 0), icon: FileText, color: "var(--chart-1)" },
            { label: "Active / Open", value: String(data.summary?.open ?? 0), icon: FileCheck, color: "var(--chart-2)" },
            { label: "Expired / At Risk", value: String(data.summary?.overdue_at_risk ?? 0), icon: AlertTriangle, color: "var(--shell-danger)" },
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
            <Input placeholder="Search documents..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export</Button>
        </div>
        <Card className="border-[--shell-border] bg-[--shell-surface]">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
                <FileText className="h-12 w-12" />
                <p className="text-base font-medium text-[--shell-foreground]">{data.documents.length === 0 ? "No documents yet" : "No documents match your search"}</p>
                <p className="text-sm">{data.documents.length === 0 ? "Upload your first document." : "Try adjusting your search."}</p>
                {data.documents.length === 0 && <Button size="sm" onClick={openCreate} className="mt-2"><Plus className="mr-1 h-4 w-4" /> Add Document</Button>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">ID</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Document</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Type</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Account</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Size</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Status</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Updated</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d: any) => (
                    <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell><span className="font-mono text-xs text-[--shell-muted]">{d.id_str}</span></TableCell>
                      <TableCell className="font-medium">{d.title}</TableCell>
                      <TableCell className="text-[--shell-muted]">{d.type}</TableCell>
                      <TableCell>{d.account}</TableCell>
                      <TableCell className="text-[--shell-muted] text-xs">{d.size}</TableCell>
                      <TableCell><Badge variant={statusVariant(d.status)} className="text-[10px]">{d.status}</Badge></TableCell>
                      <TableCell className="text-[--shell-muted] text-xs">{d.updated_at}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(d)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(d.id_str)}><Trash2 className="h-3.5 w-3.5 text-[--shell-danger]" /></Button>
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
      <MultiStepDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Document" : "Add Document"} steps={[{ title: "Details", description: "Document information" }]} currentStep={step} onStepChange={setStep} onSubmit={handleSave} disableNext={!form.title.trim()} submitLabel={editing ? "Update Document" : "Create Document"}>
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="d_title">Title</Label>
            <Input id="d_title" value={form.title} onChange={(e) => updateField("title", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d_type">Type</Label>
            <Input id="d_type" value={form.type} onChange={(e) => updateField("type", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d_account">Account</Label>
            <Input id="d_account" value={form.account} onChange={(e) => updateField("account", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d_status">Status</Label>
            <Select value={form.status} onValueChange={(v) => v !== null && updateField("status", v)}>
              <SelectTrigger id="d_status"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
      </MultiStepDialog>
    </div>
  );
}
