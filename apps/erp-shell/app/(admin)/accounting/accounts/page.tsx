"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Search, Plus, Pencil, Power, PowerOff, AlertTriangle, Loader2, Banknote, Landmark, Scale, TrendingUp, ShoppingCart } from "lucide-react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { money } from "@/utils/format";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type { Account } from "@/types/accounting";
import ChartOfAccountsLoading from "./loading";

const typeConfig: Record<string, { color: string; bg: string; icon: any }> = {
  Asset: { color: "#16a34a", bg: "from-[var(--shell-success-surface)]0/5", icon: Banknote },
  Liability: { color: "#dc2626", bg: "from-red-500/5", icon: Landmark },
  Equity: { color: "#2563eb", bg: "from-blue-500/5", icon: Scale },
  Revenue: { color: "#d97706", bg: "from-amber-500/5", icon: TrendingUp },
  Expense: { color: "#ea580c", bg: "from-orange-500/5", icon: ShoppingCart },
};

const typeOrder = ["Asset", "Liability", "Equity", "Revenue", "Expense"] as const;

const typeBalances = (type: string, accounts: Account[]) => {
  const filtered = accounts.filter((a) => a.type === type && a.is_active);
  const total = filtered.reduce((s, a) => s + a.current_balance, 0);
  return { count: filtered.length, total };
};

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("Expense");
  const [formSubType, setFormSubType] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const d = await api.get<{ accounts: Account[] }>("/accounts");
      setAccounts(d.accounts);
    } catch {
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = accounts.filter((a) => {
    const matchSearch =
      !search.trim() ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.includes(search) ||
      a.group.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || a.type === typeFilter;
    return matchSearch && matchType;
  });

  const toggleActive = async (id: number) => {
    const a = accounts.find((x) => x.id === id);
    if (!a) return;
    try {
      await api.put(`/accounts/${id}`, { is_active: !a.is_active });
      loadData();
    } catch {
      // handled by api interceptor
    }
  };

  const openEdit = (a: Account) => {
    setEditId(a.id);
    setFormCode(a.code);
    setFormName(a.name);
    setFormType(a.type);
    setFormSubType(a.group === "General" ? "" : a.group);
    setFormDesc("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode || !formName) return;
    setSaving(true);
    try {
      if (editId !== null) {
        await api.put(`/accounts/${editId}`, { code: formCode, name: formName, type: formType, sub_type: formSubType || undefined });
      } else {
        await api.post("/accounts", { code: formCode, name: formName, type: formType, sub_type: formSubType || undefined, description: formDesc || undefined });
      }
      setCreateOpen(false);
      setEditId(null);
      setFormCode(""); setFormName(""); setFormType("Expense"); setFormSubType(""); setFormDesc("");
      loadData();
    } catch {
      // handled by api interceptor
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setFormCode(""); setFormName(""); setFormType("Expense"); setFormSubType(""); setFormDesc("");
    setCreateOpen(true);
  };

  if (loading) return <ChartOfAccountsLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Chart of Accounts
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Manage your accounting chart of accounts
          </p>
        </div>
        <Button className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white" size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Account
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      {/* Type summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {typeOrder.map((type, idx) => {
          const info = typeBalances(type, accounts);
          const isActiveFilter = typeFilter === type;
          const config = typeConfig[type];
          const Icon = config.icon;
          return (
            <div
              key={type}
              className={`animate-kpi relative flex flex-col gap-1.5 rounded-xl border p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] cursor-pointer overflow-hidden ${
                isActiveFilter
                  ? "border-[var(--shell-brand)] bg-[var(--shell-surface-alt)]/50 ring-1 ring-[var(--shell-brand)]"
                  : "border-[var(--shell-border)] bg-[var(--shell-surface)]"
              }`}
              style={{ animationDelay: `${idx * 0.05}s` }}
              onClick={() => setTypeFilter(typeFilter === type ? "" : type)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${config.bg} pointer-events-none`} />
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: config.color }}>
                  {type}
                </span>
                <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
              </div>
              <span className="relative z-10 font-heading text-lg font-semibold tracking-tight text-[var(--shell-foreground)]">
                {money(info.total)}
              </span>
              <span className="relative z-10 text-xs text-[var(--shell-muted)]">{info.count} accounts</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
          <Input
            placeholder="Search by name, code, or group..."
            className="pl-8"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
        {typeFilter && (
          <Badge variant="neutral" className="gap-1">
            {typeFilter}
            <button className="ml-1 text-[var(--shell-muted)] hover:text-[var(--shell-foreground)]" onClick={() => setTypeFilter("")}>×</button>
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Opening</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => {
                const config = typeConfig[a.type] || typeConfig.Expense;
                return (
                  <TableRow key={a.id} className="relative">
                    <TableCell className="relative">
                      <span className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: config.color }} />
                      <span className="font-mono text-xs ml-2">{a.code}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: `${config.color}15` }}>
                          <config.icon className="h-3 w-3" style={{ color: config.color }} />
                        </div>
                        <span className="text-sm font-medium">{a.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">{a.group}</TableCell>
                    <TableCell className="font-mono text-xs text-[var(--shell-muted)]">{money(a.opening_balance)}</TableCell>
                    <TableCell className={`font-mono text-sm text-right ${a.current_balance < 0 ? "text-[var(--shell-danger)]" : "text-[var(--shell-foreground)]"}`}>
                      {money(Math.abs(a.current_balance))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.is_active ? "default" : "secondary"} className="capitalize text-xs">
                        {a.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(a)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => toggleActive(a.id)}>
                          {a.is_active ? (
                            <PowerOff className="h-3 w-3 text-[var(--shell-muted)]" />
                          ) : (
                            <Power className="h-3 w-3 text-[var(--shell-success)]" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Account Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId !== null ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Code</Label>
                  <Input placeholder="e.g. 1001" required value={formCode} onChange={(e) => setFormCode(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formType} onValueChange={(v) => v !== null && setFormType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {typeOrder.map((t) => {
                        const cfg = typeConfig[t];
                        return (
                          <SelectItem key={t} value={t}>
                            <span className="flex items-center gap-2">
                              <cfg.icon className="h-3 w-3" style={{ color: cfg.color }} />
                              {t}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label>Account Name</Label>
                <Input placeholder="Account name" required value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="mt-4 space-y-2">
                <Label>Sub Type / Group</Label>
                <Input placeholder="e.g. Current Asset, Operating Expense" value={formSubType} onChange={(e) => setFormSubType(e.target.value)} />
              </div>
              {editId === null && (
                <div className="mt-4 space-y-2">
                  <Label>Description</Label>
                  <Textarea rows={2} placeholder="Optional description" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white">
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {editId !== null ? "Update Account" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
