"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ScrollText, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { money } from "@/utils/format";
import type { ExpenseEntry } from "@/types/billing";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const d = await api.get<{ expenses: ExpenseEntry[] }>("/expenses");
        setExpenses(d.expenses);
      } catch {
        setError("Failed to load expenses");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
        <p className="text-sm text-muted-foreground mt-1">Track and manage business expenses</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>Recorded expense entries</CardDescription>
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
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <ScrollText className="h-8 w-8 text-muted-foreground/50" />
                      <p>No expenses recorded</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : expenses.map((e) => (
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
    </div>
  );
}
