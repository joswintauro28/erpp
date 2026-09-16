"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Receipt, Download, Trash2, AlertTriangle, Loader2, Wallet, Building2, CalendarDays } from "lucide-react";
import { toastInfo } from "@/utils/toast";
import { api } from "@/services/api";
import { handleError } from "@datavex/ui-theme";
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
import type { Expense } from "@/types/accounting";
import ExpensesLoading from "./loading";

const categoryColors: Record<string, string> = {
  "Office Supplies": "var(--shell-success)",
  "Utilities": "var(--shell-info)",
  "Rent": "var(--shell-warning)",
  "Travel": "var(--chart-1)",
  "Salary": "var(--shell-danger)",
  "Marketing": "var(--shell-accent)",
  "Software": "var(--shell-info)",
  "Insurance": "var(--chart-2)",
  "Maintenance": "var(--shell-success)",
  "Food": "var(--shell-warning)",
};

function getCategoryColor(cat: string): string {
  return categoryColors[cat] || "var(--shell-muted)";
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPaidTo, setFormPaidTo] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formMethod, setFormMethod] = useState("Bank Transfer");
  const [formRef, setFormRef] = useState("");
  const [accounts, setAccounts] = useState<{ id: number; code: string; name: string }[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const d = await api.get<{ expenses: Expense[] }>("/expenses");
      setExpenses(d.expenses);
    } catch {
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.paid_to.toLowerCase().includes(q) ||
        e.bill_number.toLowerCase().includes(q)
    );
  }, [expenses, search]);

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const pendingAmount = expenses.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses.filter((e) => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount) return;
    setSaving(true);
    try {
      await api.post("/expenses", {
        amount: Number(formAmount),
        category: formCategory || undefined,
        description: formDescription || undefined,
        account_code: "6000",
        date: formDate || undefined,
        payment_method: formMethod,
        reference: formRef || undefined,
      });
      setCreateOpen(false);
      setFormAmount(""); setFormCategory(""); setFormDescription(""); setFormDate(""); setFormRef("");
      loadData();
    } catch {
      // handled by api interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await api.delete(`/expenses/${id}`);
      loadData();
    } catch {
      // handled by api interceptor
    } finally {
      setDeleting(null);
    }
  };

  const summaryCards = [
    { label: "Total Expenses", value: money(totalAmount), subtitle: `${expenses.length} entries`, gradient: "from-[var(--shell-brand)]/5" },
    { label: "This Month", value: money(thisMonth), subtitle: new Date().toLocaleString("default", { month: "long", year: "numeric" }), gradient: "from-[var(--shell-accent)]/5" },
    { label: "Pending", value: money(pendingAmount), subtitle: `${expenses.filter((e) => e.status === "pending").length} unpaid`, gradient: "from-[var(--shell-warning)]/5" },
    { label: "Categories", value: String(new Set(expenses.map((e) => e.category)).size), subtitle: "distinct categories", gradient: "from-[var(--shell-info)]/5" },
  ];

  if (loading) return <ExpensesLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Expenses
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Track and manage business expenses
          </p>
        </div>
        <Button className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Expense
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {summaryCards.map((item, idx) => (
          <div
            key={item.label}
            className="animate-kpi relative flex flex-col gap-1.5 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] overflow-hidden"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} pointer-events-none`} />
            <span className="relative z-10 text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">
              {item.label}
            </span>
            <span className={`relative z-10 font-heading text-lg font-semibold tracking-tight ${item.label === "Pending" ? "text-[var(--shell-brand)]" : "text-[var(--shell-foreground)]"}`}>
              {item.value}
            </span>
            <span className="relative z-10 text-xs text-[var(--shell-muted)]">{item.subtitle}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
          <Input
            placeholder="Search expenses..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="max-w-sm">Description</TableHead>
                <TableHead>Paid To</TableHead>
                <TableHead>Bill #</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs text-[var(--shell-muted)]">{e.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs gap-1.5"
                      style={{ borderColor: `${getCategoryColor(e.category)}30`, color: getCategoryColor(e.category) }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(e.category) }} />
                      {e.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--shell-foreground)] max-w-sm truncate">{e.description}</TableCell>
                  <TableCell className="text-xs text-[var(--shell-muted)]">{e.paid_to}</TableCell>
                  <TableCell className="font-mono text-xs text-[var(--shell-muted)]">{e.bill_number}</TableCell>
                  <TableCell className="text-xs text-[var(--shell-muted)]">{e.payment_method}</TableCell>
                  <TableCell className="font-mono text-sm text-right">{money(e.amount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={e.status === "paid" ? "default" : e.status === "pending" ? "secondary" : "outline"}
                      className="capitalize text-xs"
                    >
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" title="Download receipt" onClick={() => toastInfo("Receipt download not yet implemented")}>
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(e.id)} disabled={deleting === e.id}>
                        {deleting === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-[var(--shell-danger)]" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5 text-[var(--shell-brand)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Expense Details</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input type="number" min={0.01} step={0.01} placeholder="0.00" required value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input placeholder="e.g. Office Supplies" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label>Description</Label>
                <Textarea rows={2} placeholder="What was this expense for?" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
            </div>

            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Payment Info</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={formMethod} onValueChange={(v) => v !== null && setFormMethod(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label>Reference / Bill #</Label>
                <Input placeholder="Bill number or reference" value={formRef} onChange={(e) => setFormRef(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving} className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white">
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Add Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
