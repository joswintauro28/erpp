"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, ShieldCheck, CheckCircle2, XCircle, PauseCircle, Plus } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import { handleError } from "@datavex/ui-theme";
import { toastError } from "@/utils/toast";

interface QualityCheck {
  id: number;
  po_id: number | null;
  product_id: number;
  product_name: string;
  quantity: number;
  status: string;
  inspected_by?: string | null;
  inspected_at?: string | null;
  notes?: string | null;
  created_at: string;
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending QC", cls: "bg-amber-600 text-white" },
  PASS: { label: "Passed", cls: "bg-emerald-600 text-white" },
  FAIL: { label: "Failed", cls: "bg-red-600 text-white" },
  HOLD: { label: "On Hold", cls: "bg-blue-600 text-white" },
};

export default function QualityChecksPage() {
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedCheck, setSelectedCheck] = useState<QualityCheck | null>(null);
  const [qcResult, setQcResult] = useState<"PASS" | "FAIL" | "HOLD">("PASS");
  const [qcNotes, setQcNotes] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [productId, setProductId] = useState<number | 0>(0);
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [poId, setPoId] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await api.get<QualityCheck[]>(`/quality-checks${params}`);
      setChecks(res || []);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleRecord = async () => {
    if (!selectedCheck) return;
    try {
      await api.put(`/quality-checks/${selectedCheck.id}/result`, {
        status: qcResult,
        notes: qcNotes || undefined,
      });
      setSelectedCheck(null);
      setQcNotes("");
      fetchData();
    } catch (err) {
      handleError(err);
      toastError("Failed to record quality result.");
    }
  };

  const handleCreate = async () => {
    try {
      await api.post("/quality-checks", {
        product_id: Number(productId) || undefined,
        product_name: productName || undefined,
        quantity: Number(quantity),
        po_id: poId ? Number(poId) : undefined,
      });
      setIsAddOpen(false);
      setProductName("");
      setPoId("");
      fetchData();
    } catch (err) {
      handleError(err);
      toastError("Failed to create quality check.");
    }
  };

  const filtered = checks.filter(
    (c) =>
      !search ||
      c.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.po_id && String(c.po_id).includes(search))
  );

  const counts = checks.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground] flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[var(--shell-brand)]" />
            Quality Checks
          </h1>
          <p className="mt-1 text-sm text-[--shell-muted]">
            Inspect received goods before they move to stock — products flagged QC-required auto-create a pending check on GRN.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)} className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-action)]">
          <Plus className="h-4 w-4 mr-2" /> Record Inspection
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["PENDING", "PASS", "FAIL", "HOLD"] as const).map((s) => (
          <Card key={s}>
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">{STATUS_BADGES[s].label}</span>
              <span className="text-xl font-bold text-[var(--shell-brand)]">{counts[s] || 0}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search product, PO..."
            className="pl-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border border-border rounded bg-background text-xs font-semibold"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending QC</option>
          <option value="PASS">Passed</option>
          <option value="FAIL">Failed</option>
          <option value="HOLD">On Hold</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Inspection Log</span>
            <span className="text-xs text-muted-foreground font-medium">Total: {checks.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No quality checks found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase">
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">PO Ref</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Inspected By</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground text-xs">{c.product_name}</TableCell>
                    <TableCell className="text-center text-xs font-semibold">{c.quantity}</TableCell>
                    <TableCell className="text-center font-mono text-xs">{c.po_id ? `#${c.po_id}` : "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${STATUS_BADGES[c.status]?.cls || "bg-muted"} text-[10px]`}>
                        {STATUS_BADGES[c.status]?.label || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">{c.inspected_by || "—"}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {c.status === "PENDING" ? (
                        <Button
                          size="xs"
                          onClick={() => {
                            setSelectedCheck(c);
                            setQcResult("PASS");
                          }}
                          className="bg-[var(--shell-brand)] text-white"
                        >
                          Record Result
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          {c.inspected_at ? new Date(c.inspected_at).toLocaleString() : "Resolved"}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Record result modal */}
      <Dialog open={!!selectedCheck} onOpenChange={(open) => !open && setSelectedCheck(null)}>
        {selectedCheck && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Inspection Result</DialogTitle>
              <DialogDescription>
                {selectedCheck.product_name} — {selectedCheck.quantity} units
                {selectedCheck.notes ? ` · ${selectedCheck.notes}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-2 text-xs">
              <div className="grid grid-cols-3 gap-2">
                {(["PASS", "FAIL", "HOLD"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setQcResult(r)}
                    className={`p-2.5 rounded-md border text-xs font-semibold transition-colors ${
                      qcResult === r
                        ? r === "PASS"
                          ? "border-[var(--shell-success)] bg-[var(--shell-success-surface)] text-[var(--shell-success)]"
                          : r === "FAIL"
                            ? "border-red-500 bg-[var(--shell-danger-surface)] text-[var(--shell-danger)]"
                            : "border-blue-500 bg-[var(--shell-info-surface)] text-[var(--shell-info)]"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {r === "PASS" ? <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> : r === "FAIL" ? <XCircle className="h-3.5 w-3.5 inline mr-1" /> : <PauseCircle className="h-3.5 w-3.5 inline mr-1" />}
                    {r === "PASS" ? "Pass" : r === "FAIL" ? "Fail" : "Hold"}
                  </button>
                ))}
              </div>
              <div>
                <label className="font-medium block mb-1">Inspection Notes</label>
                <input
                  type="text"
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="e.g. All units within tolerance"
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedCheck(null)}>Cancel</Button>
              <Button size="sm" onClick={handleRecord} className="bg-[var(--shell-brand)] text-white">
                Save Result
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Create manual check modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Manual Inspection</DialogTitle>
            <DialogDescription>Add a quality check that was not auto-created from a goods receipt.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Product Name</label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Hydraulic Pump" className="w-full p-2 border border-border rounded bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Product ID (optional)</label>
                <input type="number" value={productId} onChange={(e) => setProductId(Number(e.target.value))} className="w-full p-2 border border-border rounded bg-background" />
              </div>
              <div>
                <label className="font-medium block mb-1">Quantity</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full p-2 border border-border rounded bg-background" />
              </div>
            </div>
            <div>
              <label className="font-medium block mb-1">PO Reference (optional)</label>
              <input type="text" value={poId} onChange={(e) => setPoId(e.target.value)} placeholder="e.g. 12" className="w-full p-2 border border-border rounded bg-background" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} className="bg-[var(--shell-brand)] text-white">Create Check</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
