"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertTriangle,
  Loader2,
  Clock,
  Download,
  Search,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  History,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { api } from "@/services/api";
import { money } from "@/utils/format";

const statusVariant = (s: string) => {
  if (s === "paid") return "default" as const;
  if (s === "sent" || s === "pending") return "secondary" as const;
  if (s === "overdue" || s === "DISCREPANCY") return "destructive" as const;
  return "outline" as const;
};

export default function AgingWorkstationPage() {
  const [activeTab, setActiveTab] = useState<"summary" | "customers" | "invoices" | "reconciliation">("summary");
  
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedBucket, setSelectedBucket] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [summary, setSummary] = useState<any>(null);
  const [customersResult, setCustomersResult] = useState<any>(null);
  const [invoicesResult, setInvoicesResult] = useState<any>(null);
  const [reconciliation, setReconciliation] = useState<any>(null);

  // Drilldown modal
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState<boolean>(false);

  // Export
  const [exporting, setExporting] = useState<boolean>(false);

  const fetchSummary = async () => {
    try {
      const data = await api.get<any>(`/aging/summary?asOfDate=${asOfDate}`);
      setSummary(data);
    } catch (e) {
      console.error(e);
      setError("Failed to load aging summary");
    }
  };

  const fetchCustomers = async () => {
    try {
      const query = `/aging/customers?asOfDate=${asOfDate}&page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(searchQuery)}`;
      const data = await api.get<any>(query);
      setCustomersResult(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInvoices = async (validate: boolean = false) => {
    try {
      const query = `/aging/invoices?asOfDate=${asOfDate}&page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(searchQuery)}&agingBucket=${selectedBucket}${validate ? "&validate=true" : ""}`;
      const data = await api.get<any>(query);
      setInvoicesResult(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReconciliation = async () => {
    try {
      const data = await api.get<any>(`/aging/reconciliation?asOfDate=${asOfDate}`);
      setReconciliation(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");
    await Promise.all([
      fetchSummary(),
      fetchCustomers(),
      fetchInvoices(),
      fetchReconciliation(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [asOfDate]);

  useEffect(() => {
    if (activeTab === "customers") fetchCustomers();
    if (activeTab === "invoices") fetchInvoices();
  }, [page, searchQuery, selectedBucket, activeTab]);

  const handleExport = async (viewType: "summary" | "customers" | "invoices") => {
    setExporting(true);
    try {
      const res = await fetch(`/api/aging/export?view=${viewType}&asOfDate=${asOfDate}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
        },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AR_Aging_${viewType}_${asOfDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setExporting(false);
    }
  };

  const openDrilldown = async (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setTimelineLoading(true);
    try {
      const data = await api.get<any>(`/aging/invoice/${invoiceId}`);
      setTimelineData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTimelineLoading(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  const isReconciled = summary?.reconciliationStatus?.isReconciled ?? true;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Accounts Receivable Aging Workstation
            <Badge variant="outline" className="text-xs font-mono">v2.0 ERP</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enterprise AR Aging analysis, customer balances, GL reconciliation & audit timeline
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 shadow-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">As-Of Date:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport(activeTab === "reconciliation" ? "summary" : activeTab)}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export CSV
          </Button>

          <Button variant="ghost" size="sm" onClick={loadAll} className="h-8 w-8 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Reconciliation Status Banner */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 shadow-sm ${isReconciled ? "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20"}`}>
        <div className="flex items-center gap-3">
          {isReconciled ? (
            <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              GL Accounts Receivable Control Account: {isReconciled ? "RECONCILED" : "DISCREPANCY DETECTED"}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Subledger Net AR Balance ({money(summary?.reconciliationStatus?.subledgerBalance || 0)}) vs GL Control Account ({money(summary?.reconciliationStatus?.glBalance || 0)}) — Variance: <span className="font-mono font-bold">{money(summary?.reconciliationStatus?.variance || 0)}</span>
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveTab("reconciliation")}
          className="text-xs shrink-0"
        >
          View GL Reconciliation
        </Button>
      </div>

      {/* Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Gross AR Invoices</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-heading text-xl font-bold">{money(summary?.kpis?.totalGrossAR || 0)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{summary?.kpis?.openInvoicesCount || 0} open invoices</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Unapplied Credits</span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="font-heading text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {money(summary?.kpis?.unappliedCredits || 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Advance customer credits</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/30 bg-primary/5">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between text-xs text-primary font-medium mb-1">
              <span>Net AR Outstanding</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="font-heading text-xl font-bold text-primary">
              {money(summary?.kpis?.netAROutstanding || 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Net receivable value</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Open Customers</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-heading text-xl font-bold">{summary?.kpis?.openCustomersCount || 0}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Active debit accounts</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Overdue &gt;30 Days</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="font-heading text-xl font-bold text-amber-600 dark:text-amber-400">
              {summary?.kpis?.overdue30PlusRatio || 0}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Overdue exposure ratio</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-6">
          <button
            onClick={() => { setActiveTab("summary"); setPage(1); }}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "summary" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Summary Aging View
          </button>
          <button
            onClick={() => { setActiveTab("customers"); setPage(1); }}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "customers" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Customer-Wise View ({summary?.kpis?.openCustomersCount || 0})
          </button>
          <button
            onClick={() => { setActiveTab("invoices"); setPage(1); }}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "invoices" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Invoice-Wise Ledger ({summary?.kpis?.openInvoicesCount || 0})
          </button>
          <button
            onClick={() => { setActiveTab("reconciliation"); }}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "reconciliation" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            GL Control Reconciliation
          </button>
        </nav>
      </div>

      {/* TAB 1: SUMMARY AGING VIEW */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            {summary?.buckets?.map((bucket: any) => (
              <Card key={bucket.bucket} className="shadow-sm">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground font-medium">{bucket.bucket}</span>
                    <Badge variant={bucket.count > 0 ? bucket.bucket === "Over 90 Days" ? "destructive" : "secondary" : "outline"} className="text-[10px] px-1.5">
                      {bucket.count} inv
                    </Badge>
                  </div>
                  <p className="font-heading text-lg font-bold">{money(bucket.totalAmount)}</p>
                  <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full ${bucket.bucket === "Over 90 Days" ? "bg-red-500" : bucket.bucket === "61–90 Days" ? "bg-amber-500" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, bucket.percentage)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right mt-1">{bucket.percentage}% of total AR</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold">Aging Bucket Share Matrix</CardTitle>
              <CardDescription className="text-xs">Aggregated accounts receivable balance breakdown across standard aging brackets</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aging Bracket</TableHead>
                    <TableHead className="text-right">Open Invoices</TableHead>
                    <TableHead className="text-right">Total Balance Due</TableHead>
                    <TableHead className="text-right">Share (%)</TableHead>
                    <TableHead>Risk Classification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.buckets?.map((bucket: any) => (
                    <TableRow key={bucket.bucket}>
                      <TableCell className="font-semibold text-sm">{bucket.bucket}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{bucket.count}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold">{money(bucket.totalAmount)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium">{bucket.percentage}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={bucket.bucket === "Over 90 Days" ? "destructive" : bucket.bucket === "61–90 Days" || bucket.bucket === "31–60 Days" ? "secondary" : "outline"}
                          className="text-xs capitalize"
                        >
                          {bucket.bucket === "Current" ? "Low Risk" : bucket.bucket === "1–30 Days" ? "Moderate Risk" : bucket.bucket === "Over 90 Days" ? "High Loss Risk" : "Elevated Risk"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: CUSTOMER-WISE VIEW */}
      {activeTab === "customers" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer name..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">1–30 Days</TableHead>
                    <TableHead className="text-right">31–60 Days</TableHead>
                    <TableHead className="text-right">61–90 Days</TableHead>
                    <TableHead className="text-right">Over 90 Days</TableHead>
                    <TableHead className="text-right">Total Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersResult?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-xs">
                        No customer receivables found matching query
                      </TableCell>
                    </TableRow>
                  ) : customersResult?.data?.map((cust: any) => (
                    <TableRow key={cust.clientId}>
                      <TableCell className="font-semibold text-xs">{cust.clientName}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{cust.openInvoicesCount}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{money(cust.current)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{money(cust.days1_30)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{money(cust.days31_60)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{money(cust.days61_90)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-red-600 font-semibold">{money(cust.daysOver90)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold text-primary">{money(cust.totalOutstanding)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination Controls */}
          {customersResult?.pagination && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Showing {customersResult.data.length} of {customersResult.pagination.totalRecords} customers</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!customersResult.pagination.hasPreviousPage}
                  onClick={() => setPage(page - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>Page {customersResult.pagination.currentPage} of {customersResult.pagination.totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!customersResult.pagination.hasNextPage}
                  onClick={() => setPage(page + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVOICE-WISE LEDGER VIEW */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by invoice # or client..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-9 text-xs"
                />
              </div>
              <Select value={selectedBucket} onValueChange={(v) => { if (v) { setSelectedBucket(v); setPage(1); } }}>
                <SelectTrigger className="w-36 text-xs">
                  <SelectValue placeholder="All Buckets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Buckets</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="1_30">1–30 Days</SelectItem>
                  <SelectItem value="31_60">31–60 Days</SelectItem>
                  <SelectItem value="61_90">61–90 Days</SelectItem>
                  <SelectItem value="over_90">Over 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" onClick={() => fetchInvoices(true)} className="text-xs flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Re-validate Dynamic Balances
            </Button>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Original Total</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Credit Notes</TableHead>
                    <TableHead className="text-right">Net Balance Due</TableHead>
                    <TableHead>Overdue</TableHead>
                    <TableHead>Bucket</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesResult?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8 text-xs">
                        No open invoices match the active filters
                      </TableCell>
                    </TableRow>
                  ) : invoicesResult?.data?.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs font-semibold">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-xs">{inv.clientName}</TableCell>
                      <TableCell className="font-mono text-xs">{inv.issueDate}</TableCell>
                      <TableCell className="font-mono text-xs">{inv.dueDate}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{money(inv.originalTotal)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-600">{money(inv.paidAmount)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-red-600">{money(inv.creditNotesAmount)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-primary">{money(inv.baseCurrencyBalanceDue)}</TableCell>
                      <TableCell className="font-mono text-xs">{inv.daysOverdue}d</TableCell>
                      <TableCell>
                        <Badge
                          variant={inv.bucket === "Over 90 Days" ? "destructive" : inv.bucket === "61–90 Days" || inv.bucket === "31–60 Days" ? "secondary" : "outline"}
                          className="text-[10px]"
                        >
                          {inv.bucket}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDrilldown(inv.id)}
                          className="h-7 px-2 text-xs flex items-center gap-1"
                        >
                          <History className="h-3.5 w-3.5" />
                          Timeline
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination Controls */}
          {invoicesResult?.pagination && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Showing {invoicesResult.data.length} of {invoicesResult.pagination.totalRecords} open invoices</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!invoicesResult.pagination.hasPreviousPage}
                  onClick={() => setPage(page - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>Page {invoicesResult.pagination.currentPage} of {invoicesResult.pagination.totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!invoicesResult.pagination.hasNextPage}
                  onClick={() => setPage(page + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GL RECONCILIATION VIEW */}
      {activeTab === "reconciliation" && (
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold">Subledger to General Ledger (GL) Control Account Reconciliation</CardTitle>
              <CardDescription className="text-xs">
                Audits Subledger open invoices against posted ledger entries for Accounts Receivable Control Account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground">Subledger Gross AR Invoices</span>
                  <p className="font-heading text-xl font-bold mt-1">{money(reconciliation?.reconciliation?.subledgerGrossAR || 0)}</p>
                </div>
                <div className="rounded-lg border p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground">Unapplied Customer Credits</span>
                  <p className="font-heading text-xl font-bold text-emerald-600 mt-1">-{money(reconciliation?.reconciliation?.unappliedCredits || 0)}</p>
                </div>
                <div className="rounded-lg border p-4 border-primary/30 bg-primary/5">
                  <span className="text-xs text-primary font-medium">Net Subledger AR Balance</span>
                  <p className="font-heading text-xl font-bold text-primary mt-1">{money(reconciliation?.reconciliation?.subledgerBalance || 0)}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Control Parameter</TableHead>
                    <TableHead className="text-right">Amount (Base INR)</TableHead>
                    <TableHead>Audit Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold text-xs">Subledger Net AR Outstanding</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{money(reconciliation?.reconciliation?.subledgerBalance || 0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Sum of active open invoice balances minus unapplied customer credits</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold text-xs">General Ledger (GL) Control Account Balance</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{money(reconciliation?.reconciliation?.glBalance || 0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {reconciliation?.reconciliation?.arAccount ? `Account Code ${reconciliation.reconciliation.arAccount.code} (${reconciliation.reconciliation.arAccount.name})` : "Default AR Control Account"}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/40 font-bold">
                    <TableCell className="text-xs font-bold">Calculated Reconciliation Variance</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-amber-600">{money(reconciliation?.reconciliation?.variance || 0)}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={reconciliation?.reconciliation?.isReconciled ? "default" : "destructive"} className="capitalize">
                        {reconciliation?.reconciliation?.status || "RECONCILED"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* INVOICE CHRONOLOGICAL TIMELINE DRILLDOWN DIALOG */}
      <Dialog open={selectedInvoiceId !== null} onOpenChange={(open) => !open && setSelectedInvoiceId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Invoice Transaction Audit Timeline
            </DialogTitle>
            <DialogDescription className="text-xs">
              Chronological financial audit trail for invoice #{timelineData?.invoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          {timelineLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : timelineData ? (
            <div className="space-y-6 py-2">
              {/* Header Summary */}
              <div className="grid grid-cols-4 gap-3 rounded-lg border bg-muted/20 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <p className="font-semibold">{timelineData.invoice.clientName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <p className="font-mono font-semibold">{money(timelineData.invoice.total)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Paid:</span>
                  <p className="font-mono font-semibold text-emerald-600">{money(timelineData.invoice.paidAmount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Balance Due:</span>
                  <p className="font-mono font-bold text-primary">{money(timelineData.invoice.balanceDue)}</p>
                </div>
              </div>

              {/* Chronological Stream */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Audit Timeline Events</h4>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {timelineData.timeline?.map((evt: any) => (
                    <div key={evt.id} className="relative flex items-start justify-between gap-4">
                      <div className="absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{evt.title}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{new Date(evt.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{evt.description}</p>
                      </div>
                      {evt.amount !== undefined && (
                        <span className="font-mono text-xs font-bold text-right shrink-0">{money(evt.amount)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
