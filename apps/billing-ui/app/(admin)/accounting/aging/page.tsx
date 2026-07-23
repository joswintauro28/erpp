"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Clock } from "lucide-react";
import { api } from "@/services/api";
import { money } from "@/utils/format";

const statusVariant = (s: string) => {
  if (s === "paid") return "default" as const;
  if (s === "sent" || s === "pending") return "secondary" as const;
  if (s === "overdue") return "destructive" as const;
  return "outline" as const;
};

export default function AgingPage() {
  const [aging, setAging] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const d = await api.get<{ aging: any[] }>("/aging");
        setAging(d.aging);
      } catch {
        setError("Failed to load aging report");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  const totalOutstanding = aging.reduce((s, b) => s + b.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">AR Aging Report</h1>
        <p className="text-sm text-muted-foreground mt-1">Accounts Receivable aging summary</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {aging.map((bucket) => (
          <Card key={bucket.bucket}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{bucket.bucket}</p>
                <Badge variant={bucket.count > 0 ? bucket.bucket === "90+ Days" ? "destructive" : "secondary" : "outline"} className="text-xs">
                  {bucket.count} invoices
                </Badge>
              </div>
              <p className={`font-heading text-lg font-semibold ${bucket.count > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                {money(bucket.total)}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-2">Total Outstanding</p>
            <p className="font-heading text-lg font-semibold text-accent-foreground">{money(totalOutstanding)}</p>
          </CardContent>
        </Card>
      </div>

      {aging.map((bucket) => (
        <Card key={bucket.bucket}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-accent-foreground" />
                {bucket.bucket}
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{bucket.count} invoices</span>
                <span className="font-heading text-sm font-semibold">{money(bucket.total)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bucket.invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-xs">
                      No invoices in this bucket
                    </TableCell>
                  </TableRow>
                ) : bucket.invoices?.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inv.client_name}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{money(inv.total)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium">{money(inv.balance_due)}</TableCell>
                    <TableCell className="text-xs font-mono">{inv.due_date}</TableCell>
                    <TableCell className="text-xs font-mono">{inv.days_overdue}d</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)} className="text-xs capitalize">
                        {inv.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
