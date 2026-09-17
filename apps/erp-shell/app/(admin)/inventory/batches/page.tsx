"use client";

import { useState, useEffect, useCallback } from "react";
import { Boxes, RotateCw, Download, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader, SectionHeading, KpiCard, EmptyState, handleError } from "@datavex/ui-theme";
import { api } from "@/services/api";
import { money } from "@/utils/format";
import { useSearch, useExport } from "@/hooks";

interface BatchRecord {
  id: number;
  product_name: string;
  sku: string;
  batch_number: string;
  warehouse_name: string;
  quantity: number;
  manufactured_date: string | null;
  expiry_date: string | null;
  supplier_name: string | null;
  cost_price: number;
  status: string;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.get<BatchRecord[]>("/serial-numbers?batch=true");
      setBatches(data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { search, setSearch, filtered } = useSearch(batches, {
    keys: ["product_name", "sku", "batch_number", "warehouse_name", "supplier_name"],
  });

  const { exportCSV } = useExport();

  const now = new Date();
  const expiringSoon = batches.filter((b) => {
    if (!b.expiry_date) return false;
    const exp = new Date(b.expiry_date);
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  }).length;

  const expired = batches.filter((b) => {
    if (!b.expiry_date) return false;
    return new Date(b.expiry_date) < now;
  }).length;

  if (loading) return <div className="flex h-full items-center justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        title="Batch Tracking"
        subtitle="Track product batches, lot numbers, expiry dates, and supplier traceability."
        badge="Inventory Center"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCSV(filtered, [
              { header: "Batch", accessor: "batch_number" },
              { header: "Product", accessor: "product_name" },
              { header: "SKU", accessor: "sku" },
              { header: "Warehouse", accessor: "warehouse_name" },
              { header: "Qty", accessor: "quantity" },
              { header: "Expiry", accessor: "expiry_date" },
              { header: "Status", accessor: "status" },
            ], "batch-tracking")}
          >
            <Download size={14} className="mr-1.5" /> Export
          </Button>
        }
      />

      <section>
        <SectionHeading label="Overview" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Total Batches" value={batches.length} subtitle="Active lots" icon={Boxes} color="var(--chart-1)" index={0} />
          <KpiCard label="Expiring Soon" value={expiringSoon} subtitle="Within 30 days" icon={AlertTriangle} color="var(--shell-warning)" index={1} />
          <KpiCard label="Expired" value={expired} subtitle="Past expiry" icon={AlertTriangle} color="var(--shell-danger)" index={2} />
          <KpiCard label="Total Value" value={money(batches.reduce((s, b) => s + b.cost_price * b.quantity, 0))} subtitle="At cost" icon={Boxes} color="var(--chart-2)" index={3} />
        </div>
      </section>

      <section>
        <SectionHeading label="Batch Records" />
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search batches..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <span className="text-xs text-muted-foreground">{filtered.length} batches</span>
            </div>
            {filtered.length === 0 ? (
              <EmptyState icon={Boxes} title="No batch records" description="Batch tracking will appear here once enabled for products." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Batch #</TableHead>
                    <TableHead className="text-[11px]">Product</TableHead>
                    <TableHead className="text-[11px]">Warehouse</TableHead>
                    <TableHead className="text-[11px] text-right">Qty</TableHead>
                    <TableHead className="text-[11px]">Mfg Date</TableHead>
                    <TableHead className="text-[11px]">Expiry</TableHead>
                    <TableHead className="text-[11px] text-right">Unit Cost</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((batch) => {
                    const isExpired = batch.expiry_date && new Date(batch.expiry_date) < now;
                    const isExpiring = batch.expiry_date && !isExpired && (new Date(batch.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 30;
                    return (
                      <TableRow key={batch.id} className={isExpired ? "bg-destructive/5" : ""}>
                        <TableCell className="text-xs font-mono font-medium">{batch.batch_number}</TableCell>
                        <TableCell className="text-sm">{batch.product_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{batch.warehouse_name}</TableCell>
                        <TableCell className="text-right text-sm font-mono">{batch.quantity}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{batch.manufactured_date || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {batch.expiry_date ? (
                            <span className={isExpired ? "text-destructive font-semibold" : isExpiring ? "text-[var(--shell-warning)] font-semibold" : ""}>
                              {batch.expiry_date}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">{money(batch.cost_price)}</TableCell>
                        <TableCell>
                          <Badge variant={isExpired ? "destructive" : isExpiring ? "default" : "secondary"} className="text-[10px]">
                            {isExpired ? "Expired" : isExpiring ? "Expiring" : batch.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
