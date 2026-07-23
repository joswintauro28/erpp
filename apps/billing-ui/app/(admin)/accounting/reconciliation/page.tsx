"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, AlertTriangle, CheckCircle2, XCircle, Loader2, Banknote } from "lucide-react";
import { api } from "@/services/api";
import { money } from "@/utils/format";

export default function ReconciliationPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [matchDialog, setMatchDialog] = useState<{ txId: number; paymentId: string } | null>(null);
  const [payments, setPayments] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [txRes, repRes] = await Promise.all([
        api.get<{ transactions: any[] }>("/bank-reconciliation/transactions"),
        api.get<{ reports: any[] }>("/bank-reconciliation/reports"),
      ]);
      setTransactions(txRes.transactions);
      setReports(repRes.reports);
    } catch {
      setError("Failed to load reconciliation data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      await api.post("/bank-reconciliation/import", { csv: csvText });
      setImportOpen(false);
      setCsvText("");
      load();
    } catch { /* handled */ } finally { setImporting(false); }
  };

  const openMatch = async (txId: number) => {
    try {
      const p = await api.get<{ payments: any[] }>("/payments");
      setPayments(p.payments ?? []);
      setMatchDialog({ txId, paymentId: "" });
    } catch { /* handled */ }
  };

  const handleMatch = async () => {
    if (!matchDialog) return;
    try {
      await api.post("/bank-reconciliation/match", {
        transaction_id: matchDialog.txId,
        payment_id: parseInt(matchDialog.paymentId),
      });
      setMatchDialog(null);
      load();
    } catch { /* handled */ }
  };

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bank Reconciliation</h1>
          <p className="text-sm text-muted-foreground mt-1">Match bank statements with payments</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
          <Upload className="h-3.5 w-3.5" /> Import CSV
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      {reports.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-heading font-semibold uppercase tracking-[0.08em] text-muted-foreground">Import Batches</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {reports.map((r) => (
              <Card key={r.batch}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">{r.period_start} - {r.period_end}</p>
                    <Badge variant={r.unmatched > 0 ? "secondary" : "default"} className="text-xs">
                      {r.matched}/{r.total_transactions} matched
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Total: {money(r.total_amount)}</p>
                  {r.unmatched > 0 && (
                    <p className="text-xs text-destructive mt-1">{r.unmatched} unmatched</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Banknote className="h-4 w-4 text-accent-foreground" />
            Transactions
          </CardTitle>
          <CardDescription>Bank statement transactions and their match status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                    No transactions imported. Click "Import CSV" to upload a bank statement.
                  </TableCell>
                </TableRow>
              ) : transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-xs font-mono">{tx.date}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{tx.description || "-"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{tx.debit > 0 ? money(tx.debit) : "-"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{tx.credit > 0 ? money(tx.credit) : "-"}</TableCell>
                  <TableCell>
                    {tx.matched ? (
                      <Badge variant="default" className="text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Matched
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <XCircle className="h-3 w-3" /> Unmatched
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!tx.matched && (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => openMatch(tx.id)}>
                        Match
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4" /> Import Bank Statement CSV
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleImport}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs">CSV Data</Label>
                <p className="text-[10px] text-muted-foreground">
                  Paste CSV with columns: Date, Description, Reference, Debit, Credit, Balance
                </p>
                <textarea
                  className="flex min-h-[160px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder={"Date,Description,Reference,Debit,Credit,Balance\n2024-01-15,Payment received,INV-001,0,50000,50000"}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={importing || !csvText.trim()}>
                {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {importing ? "Importing..." : "Import"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!matchDialog} onOpenChange={() => setMatchDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Match Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Select Payment</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
                value={matchDialog?.paymentId ?? ""}
                onChange={(e) => setMatchDialog((p) => p ? { ...p, paymentId: e.target.value } : null)}
              >
                <option value="">Select a payment...</option>
                {payments.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.invoice_number} - {money(p.amount)} ({p.date})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMatchDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={handleMatch} disabled={!matchDialog?.paymentId}>Match</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
