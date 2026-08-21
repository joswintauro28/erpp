"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Banknote,
  Settings,
  History,
  Activity,
  Check,
  RefreshCw,
  Eye,
  Trash2,
  Sliders,
  DollarSign
} from "lucide-react";
import { api } from "@/services/api";
import { money } from "@/utils/format";

export default function ReconciliationPage() {
  const [activeTab, setActiveTab] = useState<"transactions" | "settings" | "variance" | "audit">("transactions");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [varianceData, setVarianceData] = useState<any>(null);
  const [toleranceRule, setToleranceRule] = useState<any>({
    amount_tolerance: 0,
    date_tolerance_days: 3,
    match_by_reference: true,
    match_by_payment_method: true,
    match_by_ledger: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<string>("");

  // Import Dialog State
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Manual Match State
  const [matchDialog, setMatchDialog] = useState<{
    tx: any;
    pairType: "payment" | "invoice" | "ledger";
    pairId: string;
    adjustmentAmount: number;
    notes: string;
  } | null>(null);

  const [paymentCandidates, setPaymentCandidates] = useState<any[]>([]);
  const [invoiceCandidates, setInvoiceCandidates] = useState<any[]>([]);
  const [ledgerCandidates, setLedgerCandidates] = useState<any[]>([]);

  // Load Initial Data
  const load = useCallback(async () => {
    try {
      const [txRes, repRes, ruleRes, varRes, auditRes] = await Promise.all([
        api.get<{ transactions: any[] }>("/bank-reconciliation/transactions"),
        api.get<{ reports: any[] }>("/bank-reconciliation/reports"),
        api.get<any>("/bank-reconciliation/config"),
        api.get<any>("/bank-reconciliation/variance-report"),
        api.get<{ logs: any[] }>("/bank-reconciliation/audit-logs")
      ]);

      setTransactions(txRes.transactions);
      setReports(repRes.reports);
      setToleranceRule({
        amount_tolerance: Number(ruleRes.amount_tolerance ?? 0),
        date_tolerance_days: ruleRes.date_tolerance_days ?? 3,
        match_by_reference: ruleRes.match_by_reference ?? true,
        match_by_payment_method: ruleRes.match_by_payment_method ?? true,
        match_by_ledger: ruleRes.match_by_ledger ?? true,
      });
      setVarianceData(varRes.summary);
      setAuditLogs(auditRes.logs ?? []);
    } catch (e: any) {
      setError("Failed to load reconciliation modules: " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Handle statement upload (supporting CSV and XLSX)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setImporting(true);
    setError("");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        try {
          const res = await api.post<any>("/bank-reconciliation/import-file", {
            file: base64,
            fileName: selectedFile.name
          });

          if (res.error) {
            setError(res.error);
          } else {
            setSuccessMsg(res.message || "File uploaded and processed successfully");
            setImportOpen(false);
            setSelectedFile(null);
            load();
          }
        } catch (err: any) {
          setError(err.message || "Failed to process statement upload");
        } finally {
          setImporting(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setError("Failed to read selected file");
      setImporting(false);
    }
  };

  // Open manual reconciliation pairing dialog
  const openMatchDialog = async (tx: any) => {
    try {
      const [pmtRes, invRes, ledRes] = await Promise.all([
        api.get<{ payments: any[] }>("/payments"),
        api.get<{ invoices: any[] }>("/invoices"),
        api.get<any>("/bank-reconciliation/transactions") // Fallback, let's fetch matching options
      ]);

      setPaymentCandidates(pmtRes.payments ?? []);
      // Filter out void/draft invoices to match against
      setInvoiceCandidates((invRes.invoices ?? []).filter((i: any) => i.status !== "draft" && i.status !== "void"));
      setLedgerCandidates([]); // We can keep empty or populate from general ledger accounts

      setMatchDialog({
        tx,
        pairType: "payment",
        pairId: "",
        adjustmentAmount: 0,
        notes: ""
      });
    } catch (err) {
      setError("Failed to fetch matching candidates");
    }
  };

  const handleManualMatch = async () => {
    if (!matchDialog || !matchDialog.pairId) return;
    try {
      setError("");
      const res = await api.post<any>("/bank-reconciliation/reconcile-manual", {
        transaction_id: matchDialog.tx.id,
        pair_type: matchDialog.pairType,
        pair_id: parseInt(matchDialog.pairId),
        adjustment_amount: Number(matchDialog.adjustmentAmount || 0),
        notes: matchDialog.notes
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg("Manual match saved successfully");
        setMatchDialog(null);
        load();
      }
    } catch (err: any) {
      setError("Reconciliation failed: " + err.message);
    }
  };

  // Revert a match
  const handleUnmatch = async (txId: number) => {
    if (!confirm("Are you sure you want to revert this reconciliation match? This will restore the transaction's unmatched status.")) return;
    try {
      setError("");
      await api.post("/bank-reconciliation/unmatch", { transaction_id: txId });
      setSuccessMsg("Match reverted successfully");
      load();
    } catch (err: any) {
      setError("Failed to revert match: " + err.message);
    }
  };

  // Update tolerance rule configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      await api.post("/bank-reconciliation/config", toleranceRule);
      setSuccessMsg("Tolerance settings updated successfully");
      load();
    } catch (err: any) {
      setError("Failed to save configuration: " + err.message);
    }
  };

  const getStatusBadge = (classification: string) => {
    switch (classification) {
      case "Matched":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-xs">Matched</Badge>;
      case "Partial_Match":
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white border-0 text-xs">Partial Match</Badge>;
      case "Duplicate":
        return <Badge variant="destructive" className="bg-purple-600 hover:bg-purple-700 text-white border-0 text-xs">Duplicate</Badge>;
      case "Exception":
        return <Badge variant="destructive" className="text-xs">Exception</Badge>;
      default:
        return <Badge variant="neutral" className="text-xs">Unmatched</Badge>;
    }
  };

  const filteredTransactions = selectedBatch
    ? transactions.filter((t) => t.batch === selectedBatch)
    : transactions;

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[var(--shell-warning)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bank Reconciliation Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">Normalize bank statements, execute auto-matching and manual resolutions with complete compliance audit trails.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => load()}>
            <RefreshCw className="h-4 w-4" /> Reload
          </Button>
          <Button size="sm" className="gap-1.5 bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-action)]" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import Statement
          </Button>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <span className="text-sm font-semibold text-destructive">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--shell-success)]/20 bg-[var(--shell-success)]/10 px-5 py-3.5">
          <CheckCircle2 className="h-5 w-5 text-[var(--shell-success)]" />
          <span className="text-sm font-semibold text-[var(--shell-success)]">{successMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-muted">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === "transactions"
              ? "border-[var(--shell-brand)] text-[var(--shell-brand)]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <Banknote className="h-4 w-4" /> Transactions ({filteredTransactions.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === "settings"
              ? "border-[var(--shell-brand)] text-[var(--shell-brand)]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <Sliders className="h-4 w-4" /> Tolerance Rules
          </span>
        </button>
        <button
          onClick={() => setActiveTab("variance")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === "variance"
              ? "border-[var(--shell-brand)] text-[var(--shell-brand)]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" /> Variance Report
          </span>
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === "audit"
              ? "border-[var(--shell-brand)] text-[var(--shell-brand)]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <History className="h-4 w-4" /> Audit Trails
          </span>
        </button>
      </div>

      {/* TAB CONTENTS */}
      {activeTab === "transactions" && (
        <div className="space-y-6">
          {/* Batches Overview */}
          {reports.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uploaded statement batches</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {reports.map((r) => (
                  <Card key={r.batch} className="cursor-pointer hover:border-[var(--shell-warning)]/50 transition-all" onClick={() => setSelectedBatch(selectedBatch === r.batch ? "" : r.batch)}>
                    <CardContent className="pt-5 pb-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-medium text-[var(--shell-warning)]">{r.batch}</span>
                        <Badge variant={selectedBatch === r.batch ? "default" : "outline"} className={selectedBatch === r.batch ? "bg-amber-600 text-white" : ""}>
                          {selectedBatch === r.batch ? "Selected" : "Filter"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Period: {r.period_start} to {r.period_end}</span>
                        <span className="font-semibold text-foreground">{r.matched}/{r.total_transactions} Matched</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Transactions List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div>
                <CardTitle className="text-md">Statement Records</CardTitle>
                <CardDescription>All bank statement transactions and their match status</CardDescription>
              </div>
              {selectedBatch && (
                <Button size="xs" variant="ghost" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => setSelectedBatch("")}>
                  Clear filter ({selectedBatch})
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit (Outflow)</TableHead>
                    <TableHead className="text-right">Credit (Inflow)</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                        No transactions found. Click "Import Statement" to upload CSV or XLSX statements.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-mono text-xs whitespace-nowrap">{tx.date}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs font-medium text-foreground">{tx.description || "-"}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{tx.reference || "-"}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-destructive font-semibold">
                          {tx.debit > 0 ? money(tx.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-[var(--shell-success)] font-semibold">
                          {tx.credit > 0 ? money(tx.credit) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(tx.classification)}
                            {tx.matched && (
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {tx.matched_payment_ref && `Pmt: ${tx.matched_payment_ref}`}
                                {tx.matched_invoice_ref && `Inv: ${tx.matched_invoice_ref}`}
                                {tx.matched_ledger_ref && `Ledger: ${tx.matched_ledger_ref}`}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.matched ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => handleUnmatch(tx.id)}
                            >
                              Unmatch
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs hover:border-[var(--shell-brand)] hover:text-[var(--shell-brand)]"
                              onClick={() => openMatchDialog(tx)}
                            >
                              Match Manually
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "settings" && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Reconciliation Matching Rules</CardTitle>
            <CardDescription>Configure tolerance policies for automatic reconciliation matching.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Maximum Amount Difference Variance</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="text-xs"
                      value={toleranceRule.amount_tolerance}
                      onChange={(e) => setToleranceRule({ ...toleranceRule, amount_tolerance: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-[10px] text-muted-foreground">Allows pairing matching items despite small differences.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Date Variance Window (Days)</Label>
                    <Input
                      type="number"
                      className="text-xs"
                      value={toleranceRule.date_tolerance_days}
                      onChange={(e) => setToleranceRule({ ...toleranceRule, date_tolerance_days: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-[10px] text-muted-foreground">Allowed days discrepancy between statement date and billing date.</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-semibold">Enabled Criteria MATCH Priority</Label>

                  <div className="flex items-center space-x-3 rounded-lg border p-3.5">
                    <input
                      id="match_by_reference"
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--shell-brand)]"
                      checked={toleranceRule.match_by_reference}
                      onChange={(e) => setToleranceRule({ ...toleranceRule, match_by_reference: e.target.checked })}
                    />
                    <div>
                      <Label htmlFor="match_by_reference" className="text-xs font-medium cursor-pointer">
                        Match by Reference/Cheque Number
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Pairs statement reference strings with billing entities.</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 rounded-lg border p-3.5">
                    <input
                      id="match_by_ledger"
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--shell-brand)]"
                      checked={toleranceRule.match_by_ledger}
                      onChange={(e) => setToleranceRule({ ...toleranceRule, match_by_ledger: e.target.checked })}
                    />
                    <div>
                      <Label htmlFor="matchByLedger" className="text-xs font-medium cursor-pointer">
                        Match against General Ledger Entries
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Also scans bank/cash ledger accounts for manual journal matching.</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-action)]">
                Save Configurations
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "variance" && varianceData && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Variance Summary</CardTitle>
              <CardDescription>Ledger Bank Account Balance vs. Bank Statement Balance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground">Bank Statement Balance</span>
                  <div className="text-xl font-bold font-mono mt-1 text-foreground">{money(varianceData.statement_balance)}</div>
                </div>
                <div className="border p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground">Ledger Balance</span>
                  <div className="text-xl font-bold font-mono mt-1 text-foreground">{money(varianceData.ledger_balance)}</div>
                </div>
              </div>

              <div className="border p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Reconciliation Adjustments (Partial Matches)</span>
                  <span className="font-mono text-foreground font-semibold">{money(varianceData.adjusted_variance)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
                  <span>Net Unreconciled Variance</span>
                  <span className={`font-mono ${varianceData.net_variance === 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>
                    {money(varianceData.net_variance)}
                  </span>
                </div>
              </div>

              {varianceData.net_variance === 0 ? (
                <div className="flex items-center gap-2.5 bg-[var(--shell-success-surface)] text-[var(--shell-success)] p-3 rounded-lg border border-[var(--shell-success)]/30 text-xs">
                  <Check className="h-4 w-4 text-[var(--shell-success)]" />
                  <span>Ledger and statements reconcile. Ready for month-end closure.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 bg-[var(--shell-warning-surface)] text-[var(--shell-warning)] p-3 rounded-lg border border-[var(--shell-warning)]/30 text-xs">
                  <AlertTriangle className="h-4 w-4 text-[var(--shell-warning)]" />
                  <span>Unreconciled variance exists. Run manual matching to clear exceptions.</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Matching Metrics</CardTitle>
              <CardDescription>Progress on Statement Items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Total Imported Statement Records</span>
                <span className="font-semibold">{varianceData.total_transactions}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Matched / Partially Matched</span>
                <span className="font-semibold text-[var(--shell-success)]">{varianceData.matched_transactions}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Outstanding Unmatched Items</span>
                <span className="font-semibold text-destructive">{varianceData.unmatched_transactions}</span>
              </div>

              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600"
                  style={{
                    width: `${
                      varianceData.total_transactions > 0
                        ? (varianceData.matched_transactions / varianceData.total_transactions) * 100
                        : 0
                    }%`
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Audit Logs (GAAP/IFRS)</CardTitle>
            <CardDescription>Immutable log records of reconciliation actions, adjustments, and updates.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Transaction Ref</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Adjustment Amt</TableHead>
                  <TableHead>Details/Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      No audit trails recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        TXN #{log.bank_transaction_id}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{log.performed_by || "System"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.adjusted_amount && Number(log.adjusted_amount) !== 0
                          ? money(Number(log.adjusted_amount))
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.notes || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* FILE UPLOAD DIALOG */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Import Bank Statement
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleImportSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select File (CSV or XLSX)</Label>
                <Input
                  type="file"
                  accept=".csv,.xlsx"
                  className="text-xs"
                  onChange={handleFileChange}
                />
                <p className="text-[10px] text-muted-foreground">
                  Make sure your sheet contains columns: Date, Description, Reference (cheque/receipt number), Debit/Credit amounts, and Balance.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-action)]" disabled={importing || !selectedFile}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {importing ? "Processing Statement..." : "Upload & Analyze"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MANUAL MATCH DIALOG */}
      <Dialog open={!!matchDialog} onOpenChange={() => setMatchDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Manual Reconciliation Resolution</DialogTitle>
          </DialogHeader>
          {matchDialog && (
            <div className="space-y-4 py-3">
              <div className="border p-3 rounded-lg bg-muted/40 space-y-1.5">
                <div className="text-xs text-muted-foreground">Statement Transaction Detail</div>
                <div className="text-xs font-semibold text-foreground">{matchDialog.tx.description}</div>
                <div className="flex justify-between text-xs font-mono">
                  <span>Amount: {money(matchDialog.tx.debit > 0 ? matchDialog.tx.debit : matchDialog.tx.credit)}</span>
                  <span>Date: {matchDialog.tx.date}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">1. Pair Target Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={matchDialog.pairType === "payment" ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => setMatchDialog({ ...matchDialog, pairType: "payment", pairId: "" })}
                  >
                    Payment Receipt
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={matchDialog.pairType === "invoice" ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => setMatchDialog({ ...matchDialog, pairType: "invoice", pairId: "" })}
                  >
                    Invoice Settlement
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={matchDialog.pairType === "ledger" ? "default" : "outline"}
                    className="text-xs"
                    disabled
                  >
                    Ledger Entry
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">2. Select Match Candidate</Label>
                {matchDialog.pairType === "payment" ? (
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus:outline-none"
                    value={matchDialog.pairId}
                    onChange={(e) => setMatchDialog({ ...matchDialog, pairId: e.target.value })}
                  >
                    <option value="">Select a payment receipt...</option>
                    {paymentCandidates.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.referenceId ? `${p.referenceId} — ` : ""} {money(p.amount)} ({new Date(p.paymentDate).toISOString().split("T")[0]})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus:outline-none"
                    value={matchDialog.pairId}
                    onChange={(e) => setMatchDialog({ ...matchDialog, pairId: e.target.value })}
                  >
                    <option value="">Select an invoice...</option>
                    {invoiceCandidates.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {money(inv.total)} (Due: {new Date(inv.dueDate).toISOString().split("T")[0]})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">3. Adjusting Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="text-xs"
                    value={matchDialog.adjustmentAmount}
                    onChange={(e) => setMatchDialog({ ...matchDialog, adjustmentAmount: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-[9px] text-muted-foreground">Adjust ledger variance for bank fees/FX differences.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">4. Reconciliation Notes</Label>
                  <Input
                    type="text"
                    className="text-xs"
                    placeholder="E.g. Bank charge / FX difference"
                    value={matchDialog.notes}
                    onChange={(e) => setMatchDialog({ ...matchDialog, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMatchDialog(null)}>Cancel</Button>
            <Button size="sm" className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-action)]" onClick={handleManualMatch} disabled={!matchDialog?.pairId}>Reconcile Match</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
