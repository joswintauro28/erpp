"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Download, Edit, Trash2, ShoppingCart, PackageCheck, AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { api } from "@/services/api";
import SalesOrdersLoading from "./loading";

const STATUS_OPTIONS = ["Pending", "Confirmed", "Invoiced", "Cancelled", "Paid"] as const;

const statusVariant = (s: string) => {
  if (s === "Pending") return "secondary" as const;
  if (s === "Confirmed" || s === "Paid") return "default" as const;
  if (s === "Invoiced") return "outline" as const;
  return "destructive" as const;
};

const fmt = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(v);

type SOForm = { so_no: string; account: string; value: number; eta: string; status: string };
const emptyForm: SOForm = { so_no: "", account: "", value: 0, eta: "", status: "Pending" };

export default function SalesOrdersPage() {
  const [data, setData] = useState<any>({ sales_orders: [], summary: { total_sales_orders: 0, open: 0, overdue_at_risk: 0, owners: 0 } });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const r = await api.get<any>("/crm/sales-orders"); if (!cancelled) setData(r); }
      catch { if (!cancelled) setData({ sales_orders: [], summary: { total_sales_orders: 0, open: 0, overdue_at_risk: 0, owners: 0 } }); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);
  const fetchData = async () => { try { setData(await api.get<any>("/crm/sales-orders")); } catch {} };

  const filtered = useMemo(() => {
    if (!search.trim()) return data.sales_orders;
    const q = search.toLowerCase();
    return data.sales_orders.filter((o: any) => o.so_no?.toLowerCase().includes(q) || o.account?.toLowerCase().includes(q));
  }, [data.sales_orders, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setStep(0); setDialogOpen(true); };
  const openEdit = (o: any) => { setEditing(o); setForm({ so_no: o.so_no, account: o.account || "", value: o.value || 0, eta: o.eta || "", status: o.status }); setStep(0); setDialogOpen(true); };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try { if (editing) await api.put(`/crm/sales-orders/${editing.id_str}`, form); else await api.post("/crm/sales-orders", form); await fetchData(); setDialogOpen(false); } catch {}
  };
  const handleDelete = async (idStr: string) => {
    try { await api.delete(`/crm/sales-orders/${idStr}`); setData((prev: any) => ({ ...prev, sales_orders: prev.sales_orders.filter((o: any) => o.id_str !== idStr), summary: { ...prev.summary, total_sales_orders: prev.summary.total_sales_orders - 1 } })); } catch {}
  };
  const updateField = (k: keyof SOForm, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  if (loading) return <SalesOrdersLoading />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Sales Orders</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Manage fulfillment and order tracking</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Sales Order</Button>
      </div>
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Overview</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Orders", value: String(data.summary?.total_sales_orders ?? 0), icon: ShoppingCart, color: "var(--chart-1)" },
            { label: "Open", value: String(data.summary?.open ?? 0), icon: PackageCheck, color: "var(--chart-2)" },
            { label: "At Risk", value: String(data.summary?.overdue_at_risk ?? 0), icon: AlertTriangle, color: "var(--shell-danger)" },
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
            <Input placeholder="Search orders..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export</Button>
        </div>
        <Card className="border-[--shell-border] bg-[--shell-surface]">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
                <ShoppingCart className="h-12 w-12" />
                <p className="text-base font-medium text-[--shell-foreground]">{data.sales_orders.length === 0 ? "No sales orders yet" : "No orders match your search"}</p>
                <p className="text-sm">{data.sales_orders.length === 0 ? "Create your first sales order." : "Try adjusting your search."}</p>
                {data.sales_orders.length === 0 && <Button size="sm" onClick={openCreate} className="mt-2"><Plus className="mr-1 h-4 w-4" /> New Sales Order</Button>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">ID</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">SO No</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Account</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Value</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">ETA</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Status</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o: any) => (
                    <TableRow key={o.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell><span className="font-mono text-xs text-[--shell-muted]">{o.id_str}</span></TableCell>
                      <TableCell className="font-medium">{o.so_no}</TableCell>
                      <TableCell className="text-[--shell-muted]">{o.account}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{fmt(o.value)}</TableCell>
                      <TableCell className="text-[--shell-muted] text-xs">{o.eta}</TableCell>
                      <TableCell><Badge variant={statusVariant(o.status)} className="text-[10px]">{o.status}</Badge></TableCell>
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
      <MultiStepDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Sales Order" : "New Sales Order"} steps={[{ title: "Details", description: "Order information" }, { title: "Fulfillment", description: "Value and timeline" }]} currentStep={step} onStepChange={setStep} onSubmit={handleSave} disableNext={!form.so_no.trim()} submitLabel={editing ? "Update Order" : "Create Order"}>
        {step === 0 && (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2"><Label htmlFor="so_no">SO No</Label><Input id="so_no" value={form.so_no} onChange={(e) => updateField("so_no", e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="so_account">Account</Label><Input id="so_account" value={form.account} onChange={(e) => updateField("account", e.target.value)} /></div>
          </div>
        )}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2"><Label htmlFor="so_value">Value (₹)</Label><Input id="so_value" type="number" min={0} value={form.value} onChange={(e) => updateField("value", Number(e.target.value))} /></div>
            <div className="space-y-2"><Label htmlFor="so_eta">ETA</Label><Input id="so_eta" type="date" value={form.eta} onChange={(e) => updateField("eta", e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="so_status">Status</Label>
              <Select value={form.status} onValueChange={(v) => v !== null && updateField("status", v)}>
                <SelectTrigger id="so_status"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
