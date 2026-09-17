"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Search, Plus, Pencil, Power, PowerOff, AlertTriangle, Loader2, Banknote, Landmark, Scale, TrendingUp, ShoppingCart } from "lucide-react";
import { api } from "@/services/api";
import { handleError, KpiCard, SectionHeading } from "@datavex/ui-theme";
import { Card, CardContent } from "@/components/ui/card";
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
import type { Account } from "@/types/accounting";
import ChartOfAccountsLoading from "./loading";

const typeConfig: Record<string, { color: string; icon: any }> = {
  Asset: { color: "var(--shell-success)", icon: Banknote },
  Liability: { color: "var(--shell-danger)", icon: Landmark },
  Equity: { color: "var(--chart-2)", icon: Scale },
  Revenue: { color: "var(--chart-3)", icon: TrendingUp },
  Expense: { color: "var(--chart-4)", icon: ShoppingCart },
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
    <div className="space-y-10 lg:space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Chart of Accounts
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your accounting chart of accounts
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white" size="sm" onClick={openCreate}>
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

      {/* Type summary cards using shared KpiCard */}
      <section>
        <SectionHeading label="Account Summary" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {typeOrder.map((type, idx) => {
            const info = typeBalances(type, accounts);
            const config = typeConfig[type];
            return (
              <KpiCard
                key={type}
                label={type}
                value={money(info.total)}
                subtitle={`${info.count} accounts`}
                icon={config.icon}
                color={config.color}
                index={idx}
                active={typeFilter === type}
                onClick={() => setTypeFilter(typeFilter === type ? "" : type)}
              />
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeading label="Accounts" />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
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
              <button className="ml-1 text-muted-foreground hover:text-foreground" onClick={() => setTypeFilter("")}>×</button>
            </Badge>
          )}
        </div>

        <Card className="mt-4">
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
                      <TableCell className="text-xs text-muted-foreground">{a.group}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{money(a.opening_balance)}</TableCell>
                      <TableCell className={`font-mono text-sm text-right ${a.current_balance < 0 ? "text-[var(--shell-danger)]" : "text-foreground"}`}>
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
                              <PowerOff className="h-3 w-3 text-muted-foreground" />
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
      </section>

      {/* Add / Edit Account Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId !== null ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="rounded-lg border p-4">
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
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
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
