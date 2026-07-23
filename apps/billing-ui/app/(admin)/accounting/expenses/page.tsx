"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollText, AlertTriangle, Plus, Loader2, Search } from "lucide-react";
import { api } from "@/services/api";
import { money } from "@/utils/format";
import type { ExpenseEntry, AccountEntry } from "@/types/billing";
import ExpensesLoading from "./loading";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formAccountId, setFormAccountId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");

  const load = useCallback(async () => {
    try {
      const [expData, accData] = await Promise.all([
        api.get<{ expenses: ExpenseEntry[] }>("/expenses"),
        api.get<{ accounts: AccountEntry[] }>("/accounts"),
      ]);
      setExpenses(expData.expenses);
      setAccounts(accData.accounts);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/expenses", {
        account_id: Number(formAccountId),
        amount: Number(formAmount),
        category: formCategory || undefined,
        description: formDescription || undefined,
        date: formDate || undefined,
      });
      setCreateOpen(false);
      setFormAccountId(""); setFormAmount(""); setFormCategory(""); setFormDescription(""); setFormDate("");
      load();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  if (loading) return <ExpensesLoading />;

  const q = search.toLowerCase();
  const filtered = q
    ? expenses.filter((e) =>
        e.account_name.toLowerCase().includes(q) ||
        (e.category ?? "").toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q) ||
        e.date.includes(q))
    : expenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage business expenses</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Record Expense</Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>{filtered.length} of {expenses.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <ScrollText className="h-8 w-8 text-muted-foreground/50" />
                      <p>{expenses.length === 0 ? "No expenses recorded" : "No expenses match your search"}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{e.date}</TableCell>
                  <TableCell className="text-xs font-medium">{e.account_name}</TableCell>
                  <TableCell className="text-xs">{e.category ?? "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.description ?? "-"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{money(e.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{e.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          <form className="space-y-5" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="ex-account">Account</Label>
              <Select value={formAccountId} onValueChange={(v) => v !== null && setFormAccountId(v)}>
                <SelectTrigger id="ex-account"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter((a) => a.type === "Expense").map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ex-amount">Amount (₹)</Label>
              <Input id="ex-amount" type="number" min={0.01} step={0.01} placeholder="0.00" required value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ex-category">Category</Label>
                <Input id="ex-category" placeholder="e.g. Office Supplies" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ex-date">Date</Label>
                <Input id="ex-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ex-desc">Description</Label>
              <Textarea id="ex-desc" rows={2} placeholder="Optional description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !formAccountId || !formAmount}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Record Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
