"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit, Trash2, Users, Eye, Loader2, Building2, Mail, Phone, MapPin, BadgeInfo } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { money } from "@/utils/format";
import { api } from "@/services/api";
import type { ApiClient } from "@/types/crm";

function localSearch(items: ApiClient[], q: string): ApiClient[] {
  if (!q.trim()) return items;
  const lower = q.toLowerCase();
  return items.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      (c.email ?? "").toLowerCase().includes(lower) ||
      (c.phone ?? "").includes(lower) ||
      (c.gst_number ?? "").toLowerCase().includes(lower),
  );
}

const emptyForm = { name: "", email: "", phone: "", gst_number: "", state: "", address: "", notes: "" };

export default function Clients() {
  const router = useRouter();
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [gstFilter, setGstFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<ApiClient | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    api.get<ApiClient[]>("/clients")
      .then((data) => {
        setClients(data);
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const searched = localSearch(clients, search);
    if (gstFilter === "true") return searched.filter((c) => c.gst_number);
    if (gstFilter === "false") return searched.filter((c) => !c.gst_number);
    return searched;
  }, [clients, search, gstFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setStep(0);
    setDialogOpen(true);
  };

  const openEdit = (c: ApiClient) => {
    setEditing(c);
    setForm({
      name: c.name, email: c.email ?? "", phone: c.phone ?? "",
      gst_number: c.gst_number ?? "", state: c.state ?? "", address: c.address ?? "", notes: c.notes ?? "",
    });
    setStep(0);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v) body[k] = v;
      }
      if (editing) {
        const updated = await api.put<ApiClient>(`/clients/${editing.id}`, body);
        setClients((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      } else {
        const created = await api.post<ApiClient>("/clients", body);
        setClients((prev) => [...prev, created]);
      }
      setDialogOpen(false);
    } catch { /* keep dialog open on error */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/clients/${id}`);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch { /* ignore */ }
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[--shell-muted]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Clients</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Manage client profiles, GST details, and billing history</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Client</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
          <Input placeholder="Search name, email, phone, GST..." className="pl-8" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={gstFilter} onValueChange={(v) => v !== null && setGstFilter(v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All clients</SelectItem>
            <SelectItem value="true">GST clients</SelectItem>
            <SelectItem value="false">No GST</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
              <Users className="h-12 w-12" />
              <p className="text-base font-medium text-[--shell-foreground]">
                {clients.length === 0 ? "No clients yet" : "No clients match your search"}
              </p>
              <p className="text-sm">
                {clients.length === 0
                  ? "Create your first client to get started."
                  : "Try adjusting your search or filters."}
              </p>
              {clients.length === 0 && (
                <Button size="sm" onClick={openCreate} className="mt-2">
                  <Plus className="mr-1 h-4 w-4" /> Add Client
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-[--shell-muted]">{c.email || "-"}</TableCell>
                    <TableCell className="text-[--shell-muted]">{c.phone || "-"}</TableCell>
                    <TableCell>
                      {c.gst_number ? <span className="font-mono text-xs">{c.gst_number}</span>
                        : <span className="text-xs text-[--shell-muted]">-</span>}
                    </TableCell>
                    <TableCell className="text-[--shell-muted]">{c.state || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/crm/clients/${c.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c.id)}>
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

      <MultiStepDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Client" : "Add Client"}
        steps={[{ title: "Contact", description: "Basic contact information" }, { title: "Address", description: "Location and tax details" }]}
        currentStep={step}
        onStepChange={setStep}
        onSubmit={handleSave}
        isSubmitting={saving}
        disableNext={!form.name.trim()}
        submitLabel={editing ? "Update Client" : "Create Client"}
      >
        {step === 0 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              {(["name", "email", "phone"] as const).map((f) => (
                <div key={f} className="space-y-2">
                  <Label htmlFor={f} className="text-sm font-medium text-[--shell-muted] capitalize">{f.replace(/_/g, " ")}</Label>
                  <Input id={f} value={form[f]} onChange={(e) => updateField(f, e.target.value)}
                    required={f === "name"} type={f === "email" ? "email" : "text"} />
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              {(["gst_number", "state", "address"] as const).map((f) => (
                <div key={f} className={f === "address" ? "col-span-2 space-y-2" : "space-y-2"}>
                  <Label htmlFor={f} className="text-sm font-medium text-[--shell-muted] capitalize">{f.replace(/_/g, " ")}</Label>
                  <Input id={f} value={form[f]} onChange={(e) => updateField(f, e.target.value)} />
                </div>
              ))}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes" className="text-[--shell-muted]">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} />
              </div>
            </div>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
