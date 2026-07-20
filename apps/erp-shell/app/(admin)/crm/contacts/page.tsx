"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Download, Edit, Trash2, Users, UserCheck, AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { api } from "@/services/api";
import ContactsLoading from "./loading";

const TYPE_OPTIONS = ["Primary", "Decision", "Influencer", "Inactive"] as const;

const typeVariant = (t: string) => {
  if (t === "Primary") return "default" as const;
  if (t === "Decision") return "secondary" as const;
  if (t === "Influencer") return "outline" as const;
  return "destructive" as const;
};

type ContactForm = {
  name: string;
  role: string;
  email: string;
  phone: string;
  type: string;
};

const emptyForm: ContactForm = { name: "", role: "", email: "", phone: "", type: "Primary" };

export default function ContactsPage() {
  const [data, setData] = useState<any>({ contacts: [], summary: { total_contacts: 0, open: 0, overdue_at_risk: 0, owners: 0 } });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.get<any>("/crm/contacts");
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setData({ contacts: [], summary: { total_contacts: 0, open: 0, overdue_at_risk: 0, owners: 0 } });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchData = async () => {
    try {
      const result = await api.get<any>("/crm/contacts");
      setData(result);
    } catch {}
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return data.contacts;
    const q = search.toLowerCase();
    return data.contacts.filter((c: any) =>
      c.name?.toLowerCase().includes(q) ||
      c.role?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [data.contacts, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm); setStep(0); setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ name: c.name, role: c.role || "", email: c.email || "", phone: c.phone || "", type: c.type || "Primary" });
    setStep(0); setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/crm/contacts/${editing.id_str}`, form);
      } else {
        await api.post("/crm/contacts", form);
      }
      await fetchData();
      setDialogOpen(false);
    } catch {}
  };

  const handleDelete = async (idStr: string) => {
    try {
      await api.delete(`/crm/contacts/${idStr}`);
      setData((prev: any) => ({
        ...prev, contacts: prev.contacts.filter((c: any) => c.id_str !== idStr),
        summary: { ...prev.summary, total_contacts: prev.summary.total_contacts - 1 },
      }));
    } catch {}
  };

  const updateField = (key: keyof ContactForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  if (loading) return <ContactsLoading />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Contacts</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Manage contacts across all accounts</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Contact</Button>
      </div>

      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Overview</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Contacts", value: String(data.summary?.total_contacts ?? 0), icon: Users, color: "var(--chart-1)" },
            { label: "Active / Open", value: String(data.summary?.open ?? 0), icon: UserCheck, color: "var(--chart-2)" },
            { label: "Inactive / At Risk", value: String(data.summary?.overdue_at_risk ?? 0), icon: AlertTriangle, color: "var(--shell-danger)" },
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
            <Input placeholder="Search contacts..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export</Button>
        </div>

        <Card className="border-[--shell-border] bg-[--shell-surface]">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
                <Users className="h-12 w-12" />
                <p className="text-base font-medium text-[--shell-foreground]">{data.contacts.length === 0 ? "No contacts yet" : "No contacts match your search"}</p>
                <p className="text-sm">{data.contacts.length === 0 ? "Create your first contact." : "Try adjusting your search."}</p>
                {data.contacts.length === 0 && <Button size="sm" onClick={openCreate} className="mt-2"><Plus className="mr-1 h-4 w-4" /> Add Contact</Button>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">ID</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Name</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Role</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Account</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Email</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Phone</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Type</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c: any) => (
                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell><span className="font-mono text-xs text-[--shell-muted]">{c.id_str}</span></TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-[--shell-muted]">{c.role}</TableCell>
                      <TableCell>{c.account}</TableCell>
                      <TableCell className="text-[--shell-muted] text-xs">{c.email}</TableCell>
                      <TableCell className="text-[--shell-muted] text-xs">{c.phone}</TableCell>
                      <TableCell><Badge variant={typeVariant(c.type)} className="text-[10px]">{c.type}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c.id_str)}><Trash2 className="h-3.5 w-3.5 text-[--shell-danger]" /></Button>
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
        open={dialogOpen} onOpenChange={setDialogOpen}
        title={editing ? "Edit Contact" : "Add Contact"}
        steps={[
          { title: "Details", description: "Name and role" },
          { title: "Contact", description: "Email, phone, and type" },
        ]}
        currentStep={step} onStepChange={setStep}
        onSubmit={handleSave}
        disableNext={!form.name.trim()}
        submitLabel={editing ? "Update Contact" : "Create Contact"}
      >
        {step === 0 && (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="ct_name">Name</Label>
              <Input id="ct_name" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct_role">Role</Label>
              <Input id="ct_role" value={form.role} onChange={(e) => updateField("role", e.target.value)} />
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="ct_email">Email</Label>
              <Input id="ct_email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct_phone">Phone</Label>
              <Input id="ct_phone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct_type">Type</Label>
              <Select value={form.type} onValueChange={(v) => v !== null && updateField("type", v)}>
                <SelectTrigger id="ct_type"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPE_OPTIONS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
