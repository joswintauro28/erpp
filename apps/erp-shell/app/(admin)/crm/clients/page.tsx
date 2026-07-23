"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, Edit, Trash2, Users, UserCheck, AlertTriangle, Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { api } from "@/services/api";
import type { CrmCustomer, CrmCustomersResponse } from "@/types/crm";
import ClientsLoading from "./loading";

const STATUS_OPTIONS = ["Active", "Prospect", "Dormant", "Churned"] as const;
const TIER_OPTIONS = ["Platinum", "Gold", "Silver"] as const;

const tierVariant = (tier: string) => {
  if (tier === "Platinum") return "default" as const;
  if (tier === "Gold") return "secondary" as const;
  return "outline" as const;
};

const statusVariant = (status: string) => {
  if (status === "Active") return "default" as const;
  if (status === "Prospect") return "secondary" as const;
  if (status === "Dormant") return "outline" as const;
  return "destructive" as const;
};

const f = (v: number) => `₹${(v / 100000).toFixed(1)}L`;

type ClientForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

const emptyForm: ClientForm = { name: "", email: "", phone: "", address: "", notes: "" };

function localSearch(items: CrmCustomer[], q: string): CrmCustomer[] {
  if (!q.trim()) return items;
  const lower = q.toLowerCase();
  return items.filter(
    (c) =>
      c.account.toLowerCase().includes(lower) ||
      c.id_str.toLowerCase().includes(lower) ||
      c.industry.toLowerCase().includes(lower) ||
      c.tier.toLowerCase().includes(lower) ||
      c.status.toLowerCase().includes(lower),
  );
}

export default function Clients() {
  const [data, setData] = useState<CrmCustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<CrmCustomer | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.get<CrmCustomersResponse>("/crm/customers");
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.customers;
    if (search) items = localSearch(items, search);
    if (statusFilter) items = items.filter((c) => c.status === statusFilter);
    if (tierFilter) items = items.filter((c) => c.tier === tierFilter);
    return items;
  }, [data, search, statusFilter, tierFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setStep(0);
    setDialogOpen(true);
  };

  const openEdit = (c: CrmCustomer) => {
    setEditing(c);
    setForm({
      name: c.account,
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
    setStep(0);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/clients/${editing.id_str}`, { name: form.name });
      } else {
        await api.post("/clients", form);
      }
      const result = await api.get<CrmCustomersResponse>("/crm/customers");
      setData(result);
      setDialogOpen(false);
    } catch {
      // persist error
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (idStr: string) => {
    try {
      await api.delete(`/clients/${idStr}`);
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          customers: prev.customers.filter((c) => c.id_str !== idStr),
          summary: {
            ...prev.summary,
            total_customers: prev.summary.total_customers - 1,
          },
        };
      });
    } catch {
      // ignore
    }
  };

  const updateField = (key: keyof ClientForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <ClientsLoading />;
  }

  const summary = data?.summary;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Clients
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Central directory of every account you serve
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Client Overview KPIs */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">
            Client Overview
          </h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Customers", value: String(summary?.total_customers ?? 0), icon: Users, color: "var(--chart-1)" },
            { label: "Active / Open", value: String(summary?.open ?? 0), icon: UserCheck, color: "var(--chart-2)" },
            { label: "Overdue / At Risk", value: String(summary?.overdue_at_risk ?? 0), icon: AlertTriangle, color: "var(--shell-danger)" },
            { label: "Representatives", value: String(summary?.owners ?? 0), icon: Building2, color: "var(--chart-4)" },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">
                  {kpi.label}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)]">
                  <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                </div>
              </div>
              <span className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">
                {kpi.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Client Registry */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">
            Client Registry
          </h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
            <Input
              placeholder="Search by name, ID, industry..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => v !== null && setStatusFilter(v)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={(v) => v !== null && setTierFilter(v)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All tiers</SelectItem>
              {TIER_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="hover:shadow-md transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
                <Users className="h-12 w-12" />
                <p className="text-base font-medium text-[var(--shell-foreground)]">
                  {data?.customers.length === 0 ? "No clients yet" : "No clients match your search"}
                </p>
                <p className="text-sm">
                  {data?.customers.length === 0
                    ? "Create your first client to start building your account directory."
                    : "Try adjusting your search or filters."}
                </p>
                {data?.customers.length === 0 && (
                  <Button size="sm" onClick={openCreate} className="mt-2">
                    <Plus className="mr-1 h-4 w-4" /> Add Client
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">ID</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Account</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Industry</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Tier</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">ARR</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Status</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Updated</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <span className="font-mono text-xs text-[var(--shell-muted)]">{c.id_str}</span>
                      </TableCell>
                      <TableCell className="font-medium">{c.account}</TableCell>
                      <TableCell className="text-[var(--shell-muted)]">{c.industry}</TableCell>
                      <TableCell>
                        <Badge variant={tierVariant(c.tier)} className="uppercase text-[10px]">
                          {c.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-right">{f(c.arr)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(c.status)} className="uppercase text-[10px]">
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[var(--shell-muted)] text-xs">{c.updated_at}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c.id_str)}>
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
      </section>

      <MultiStepDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Client" : "Add Client"}
        steps={[
          { title: "Contact", description: "Account and contact information" },
          { title: "Address", description: "Location and additional details" },
        ]}
        currentStep={step}
        onStepChange={setStep}
        onSubmit={handleSave}
        isSubmitting={saving}
        disableNext={!form.name.trim()}
        submitLabel={editing ? "Update Client" : "Create Client"}
      >
        {step === 0 && (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Account Name</Label>
              <Input id="name" value={form.name}
                onChange={(e) => updateField("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email}
                onChange={(e) => updateField("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)} />
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address}
                onChange={(e) => updateField("address", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)} rows={3} />
            </div>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
