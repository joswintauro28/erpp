"use client";

import { useState, useMemo, useEffect } from "react";
import {
  UserPlus, Plus, Search, Edit, Trash2, CheckCircle, Loader2,
  TrendingUp, Target, DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { searchLeads, money } from "@/utils/format";
import { api } from "@/services/api";
import type { Lead } from "@/types/crm";

type LeadForm = {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  lead_score: number;
  assigned_to: string;
  source: string;
  expected_value: number;
  status: Lead["status"];
  gst_number: string;
  state: string;
  address: string;
  website: string;
  industry: string;
  notes: string;
};

const emptyForm: LeadForm = {
  company_name: "",
  contact_person: "",
  email: "",
  phone: "",
  status: "New",
  lead_score: 0,
  assigned_to: "",
  source: "Website",
  expected_value: 0,
  notes: "",
  gst_number: "",
  state: "",
  address: "",
  website: "",
  industry: "",
};

const statusOptions = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"] as const;
const sourceOptions = ["Website", "Referral", "Social Media", "Email", "Cold Call", "Other"];

const statusVariant = (s: string) => {
  if (s === "Won" || s === "Qualified") return "default" as const;
  if (s === "Proposal") return "secondary" as const;
  if (s === "Lost") return "destructive" as const;
  return "outline" as const;
};

function ScoreDot({ score }: { score: number }) {
  const color = score >= 70 ? "var(--shell-success)" : score >= 40 ? "var(--shell-warning)" : "var(--shell-danger)";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-mono text-sm">{score}</span>
    </span>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [leadsLoading, setLeadsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<Lead[]>("/leads");
        if (!cancelled) setLeads(data);
      } catch {
        if (!cancelled) setLeads([]);
      } finally {
        if (!cancelled) setLeadsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchLeads = async () => {
    try {
      const data = await api.get<Lead[]>("/leads");
      setLeads(data);
    } catch {
      setLeads([]);
    }
  };

  const filtered = useMemo(() => {
    const searched = searchLeads(leads, search);
    if (!statusFilter) return searched;
    return searched.filter((l) => l.status === statusFilter);
  }, [leads, search, statusFilter]);

  const analytics = useMemo(() => {
    const totalLeads = leads.length;
    const wonLeads = leads.filter((l) => l.status === "Won").length;
    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0";
    const avgScore = totalLeads > 0
      ? (leads.reduce((s, l) => s + l.lead_score, 0) / totalLeads).toFixed(1)
      : "0.0";
    const pipelineValue = leads.reduce((s, l) => s + l.expected_value, 0);
    return { totalLeads, conversionRate, avgScore, pipelineValue };
  }, [leads]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setStep(0);
    setDialogOpen(true);
  };

  const openEdit = (l: Lead) => {
    setEditing(l);
    setForm({
      company_name: l.company_name,
      contact_person: l.contact_person ?? "",
      email: l.email ?? "",
      phone: l.phone ?? "",
      status: l.status,
      lead_score: l.lead_score,
      assigned_to: l.assigned_to ?? "",
      source: l.source,
      expected_value: l.expected_value,
      notes: l.notes ?? "",
      gst_number: l.gst_number ?? "",
      state: l.state ?? "",
      address: l.address ?? "",
      website: l.website ?? "",
      industry: l.industry ?? "",
    });
    setStep(0);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const updated = await api.put<Lead>(`/leads/${editing.id}`, form);
        setLeads((prev) => prev.map((l) => (l.id === editing.id ? updated : l)));
      } else {
        const created = await api.post<Lead>("/leads", form);
        setLeads((prev) => [...prev, created]);
      }
      setDialogOpen(false);
    } catch {
      // persist error
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/leads/${id}`);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch {
      // persist error
    }
  };

  const handleConvert = async (lead: Lead) => {
    if (lead.converted_client_id) return;
    try {
      const updated = await api.post<Lead>(`/leads/${lead.id}/convert`, {});
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
    } catch {
      // persist error
    }
  };

  const updateField = (key: keyof LeadForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (leadsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[--shell-muted]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Leads
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Manage pipeline, lead scoring, and conversions
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </div>

      {/* Pipeline Analytics */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">
            Pipeline Analytics
          </h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Leads", value: String(analytics.totalLeads), icon: UserPlus, color: "var(--chart-1)" },
            { label: "Conversion Rate", value: `${analytics.conversionRate}%`, icon: TrendingUp, color: "var(--chart-2)" },
            { label: "Avg. Score", value: analytics.avgScore, icon: Target, color: "var(--chart-3)" },
            { label: "Pipeline Value", value: money(analytics.pipelineValue), icon: DollarSign, color: "var(--chart-4)" },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[--shell-border] bg-[--shell-surface] p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">
                  {kpi.label}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[--shell-border] bg-[--shell-bg]">
                  <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                </div>
              </div>
              <span className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">
                {kpi.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Lead Registry */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">
            Lead Registry
          </h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
            <Input
              placeholder="Search leads..."
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
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {leads.length > 0 && (
            <Button variant="ghost" size="sm" onClick={fetchLeads}>
              Reset
            </Button>
          )}
        </div>

        <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
                <UserPlus className="h-12 w-12" />
                <p className="text-base font-medium text-[--shell-foreground]">
                  {leads.length === 0 ? "No leads yet" : "No leads match your search"}
                </p>
                <p className="text-sm">
                  {leads.length === 0
                    ? "Create your first lead to start building your pipeline."
                    : "Try adjusting your search or filters."}
                </p>
                {leads.length === 0 && (
                  <Button size="sm" onClick={openCreate} className="mt-2">
                    <Plus className="mr-1 h-4 w-4" /> Add Lead
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Company</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Contact</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Status</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Score</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Value</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Source</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="font-medium">{l.company_name}</div>
                        <div className="text-xs text-[--shell-muted]">{l.email}</div>
                      </TableCell>
                      <TableCell>
                        <div>{l.contact_person}</div>
                        <div className="text-xs text-[--shell-muted]">{l.phone}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(l.status)} className="capitalize">
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ScoreDot score={l.lead_score} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{money(l.expected_value)}</TableCell>
                      <TableCell>
                        <span className="text-xs text-[--shell-muted]">{l.source}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(l)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleConvert(l)}
                            disabled={!!l.converted_client_id}
                            title={l.converted_client_id ? "Already converted" : "Convert to client"}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(l.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-[--shell-danger]" />
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
      </section>

      <MultiStepDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Lead" : "Add Lead"}
        steps={[
          { title: "Contact", description: "Company and contact information" },
          { title: "Details", description: "Lead scoring and pipeline details" },
          { title: "Extras", description: "Additional information and notes" },
        ]}
        currentStep={step}
        onStepChange={setStep}
        onSubmit={handleSave}
        disableNext={step === 0 && (!form.company_name.trim() || !(form.contact_person ?? "").trim())}
        submitLabel={editing ? "Update Lead" : "Create Lead"}
      >
  {step === 0 && (
    <div className="grid grid-cols-2 gap-x-5 gap-y-4">
      <div className="space-y-2">
        <Label htmlFor="company_name" className="text-[--shell-muted]">Company Name</Label>
        <Input id="company_name" value={form.company_name}
          onChange={(e) => updateField("company_name", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact_person" className="text-[--shell-muted]">Contact Person</Label>
        <Input id="contact_person" value={form.contact_person}
          onChange={(e) => updateField("contact_person", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead_email" className="text-[--shell-muted]">Email</Label>
        <Input id="lead_email" type="email" value={form.email}
          onChange={(e) => updateField("email", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead_phone" className="text-[--shell-muted]">Phone</Label>
        <Input id="lead_phone" value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)} />
      </div>
    </div>
  )}
  {step === 1 && (
    <div className="grid grid-cols-2 gap-x-5 gap-y-4">
      <div className="space-y-2">
        <Label htmlFor="lead_status" className="text-[--shell-muted]">Status</Label>
        <Select value={form.status} onValueChange={(v) => v !== null && updateField("status", v)}>
          <SelectTrigger id="lead_status" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead_score" className="text-[--shell-muted]">Lead Score</Label>
        <Input id="lead_score" type="number" min={0} max={100} value={form.lead_score}
          onChange={(e) => updateField("lead_score", Number(e.target.value))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assigned_to" className="text-[--shell-muted]">Assigned To</Label>
        <Input id="assigned_to" value={form.assigned_to}
          onChange={(e) => updateField("assigned_to", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead_source" className="text-[--shell-muted]">Source</Label>
        <Select value={form.source} onValueChange={(v) => v !== null && updateField("source", v)}>
          <SelectTrigger id="lead_source" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {sourceOptions.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="expected_value" className="text-[--shell-muted]">Expected Value (₹)</Label>
        <Input id="expected_value" type="number" min={0} step="0.01" value={form.expected_value}
          onChange={(e) => updateField("expected_value", Number(e.target.value))} />
      </div>
    </div>
  )}
  {step === 2 && (
    <div className="grid grid-cols-2 gap-x-5 gap-y-4">
      <div className="space-y-2">
        <Label htmlFor="lead_gst" className="text-[--shell-muted]">GST Number</Label>
        <Input id="lead_gst" value={form.gst_number}
          onChange={(e) => updateField("gst_number", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead_state" className="text-[--shell-muted]">State</Label>
        <Input id="lead_state" value={form.state}
          onChange={(e) => updateField("state", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead_industry" className="text-[--shell-muted]">Industry</Label>
        <Input id="lead_industry" value={form.industry}
          onChange={(e) => updateField("industry", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead_website" className="text-[--shell-muted]">Website</Label>
        <Input id="lead_website" value={form.website}
          onChange={(e) => updateField("website", e.target.value)} placeholder="https://" />
      </div>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="lead_address" className="text-[--shell-muted]">Address</Label>
        <Input id="lead_address" value={form.address}
          onChange={(e) => updateField("address", e.target.value)} />
      </div>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="lead_notes" className="text-[--shell-muted]">Notes</Label>
              <Textarea id="lead_notes" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} />
            </div>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
