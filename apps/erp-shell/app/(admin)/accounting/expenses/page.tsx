"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Receipt, Download, Trash2, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { money } from "@/utils/format";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type { Expense } from "@/types/accounting";

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const d = await api.get<{ expenses: Expense[] }>("/expenses");
        setExpenses(d.expenses);
      } catch {
        setError("Failed to load expenses");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Expenses
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Track and manage business expenses
          </p>
        </div>
        <Button size="sm">
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
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{money(totalAmount)}</p>
            <p className="text-xs text-[--shell-muted]">{expenses.length} entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">This Month</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{money(thisMonth)}</p>
            <p className="text-xs text-[--shell-muted]">August 2024</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Pending</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-action]">{money(pendingAmount)}</p>
            <p className="text-xs text-[--shell-muted]">{expenses.filter((e) => e.status === "pending").length} unpaid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Categories</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{new Set(expenses.map((e) => e.category)).size}</p>
            <p className="text-xs text-[--shell-muted]">distinct categories</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b border-[--shell-border] p-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
              <Input
                placeholder="Search expenses..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
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
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{e.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{e.category}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[--shell-foreground] max-w-sm truncate">{e.description}</TableCell>
                  <TableCell className="text-xs text-[--shell-muted]">{e.paid_to}</TableCell>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{e.bill_number}</TableCell>
                  <TableCell className="text-xs text-[--shell-muted]">{e.payment_method}</TableCell>
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
                      <Button variant="ghost" size="icon-sm">
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon-sm">
                        <Trash2 className="h-3 w-3 text-[--shell-danger]" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
