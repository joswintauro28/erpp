"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Bell, BellOff } from "lucide-react";
import { api } from "@/services/api";
import { handleError, KpiCard } from "@datavex/ui-theme";
import { money } from "@/utils/format";

const levelColors: Record<number, string> = {
  1: "bg-[var(--shell-warning-surface)] text-[var(--shell-warning)] border-[var(--shell-warning)]/30",
  2: "bg-[var(--shell-warning)]/10 text-[var(--shell-warning)] border-[var(--shell-warning)]/20",
  3: "bg-[var(--shell-danger-surface)] text-[var(--shell-danger)] border-[var(--shell-danger)]/30",
};

const levelLabels: Record<number, string> = {
  1: "Level 1 - Reminder",
  2: "Level 2 - Warning",
  3: "Level 3 - Final Notice",
};

export default function DunningPage() {
  const [dunning, setDunning] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const d = await api.get<{ dunning: any[] }>("/dunning");
        setDunning(d.dunning);
      } catch {
        setError("Failed to load dunning records");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) {
    return <div className="flex h-60 items-center justify-center"><Loader2 size={24} className="animate-spin text-[var(--shell-accent)]" /></div>;
  }

  const totalDue = dunning.reduce((s, r) => s + r.balance_due, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dunning & Collections</h1>
          <p className="text-sm text-muted-foreground mt-1">Overdue invoice escalation tracking</p>
        </div>
        <Badge variant="neutral" className="text-xs gap-1.5"><Bell className="h-3 w-3" /> Auto-escalated daily</Badge>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Active Dunning Records" value={dunning.length} subtitle="escalated invoices" icon={Bell} color="var(--chart-1)" index={0} />
        <KpiCard label="Level 3 (Final Notice)" value={dunning.filter((r) => r.level === 3).length} subtitle="critical escalations" icon={AlertTriangle} color="var(--shell-danger)" index={1} />
        <KpiCard label="Total Amount in Collections" value={money(totalDue)} subtitle="outstanding balance" icon={BellOff} color="var(--shell-warning)" index={2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm"><BellOff className="h-4 w-4 text-muted-foreground" /> Dunning Records</CardTitle>
          <CardDescription>Escalated overdue invoices and their current dunning level</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Dunning Level</TableHead>
                <TableHead>Notified At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dunning.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">No dunning records. All invoices are current.</TableCell></TableRow>
              ) : dunning.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.invoice_number}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.client_name}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-medium">{money(r.balance_due)}</TableCell>
                  <TableCell className="text-xs font-mono">{r.due_date}</TableCell>
                  <TableCell className="text-xs font-mono">{r.days_overdue}d</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${levelColors[r.level] ?? "bg-muted text-muted-foreground"}`}>
                      {levelLabels[r.level] ?? `Level ${r.level}`}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.notified_at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
