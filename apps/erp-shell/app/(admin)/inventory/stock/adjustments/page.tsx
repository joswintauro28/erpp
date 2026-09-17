"use client";

import { useState, useEffect, useCallback } from "react";
import { SlidersHorizontal, RotateCw, Download, Search, Filter } from "lucide-react";
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

interface StockAdjustment {
  id: number;
  product_name: string;
  sku: string;
  warehouse_name: string;
  type: string;
  quantity: number;
  reason: string;
  notes: string;
  adjusted_by: string;
  created_at: string;
}

export default function StockAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.get<StockAdjustment[]>("/stock/movements?type=adjustment");
      setAdjustments(data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { search, setSearch, filtered } = useSearch(adjustments, {
    keys: ["product_name", "sku", "warehouse_name", "reason", "adjusted_by"],
  });

  const { exportCSV } = useExport();

  if (loading) return <div className="flex h-full items-center justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        title="Stock Adjustments"
        subtitle="Track and manage inventory adjustments with reason codes and audit trail."
        badge="Inventory Center"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCSV(filtered, [
              { header: "Date", accessor: "created_at" },
              { header: "Product", accessor: "product_name" },
              { header: "SKU", accessor: "sku" },
              { header: "Warehouse", accessor: "warehouse_name" },
              { header: "Qty Change", accessor: "quantity" },
              { header: "Reason", accessor: "reason" },
              { header: "Adjusted By", accessor: "adjusted_by" },
            ], "stock-adjustments")}
          >
            <Download size={14} className="mr-1.5" /> Export
          </Button>
        }
      />

      <section>
        <SectionHeading label="Adjustment History" />
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search adjustments..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <span className="text-xs text-muted-foreground">{filtered.length} adjustments</span>
            </div>
            {filtered.length === 0 ? (
              <EmptyState icon={SlidersHorizontal} title="No stock adjustments" description="Adjustments are logged when stock levels are modified." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Date</TableHead>
                    <TableHead className="text-[11px]">Product</TableHead>
                    <TableHead className="text-[11px]">SKU</TableHead>
                    <TableHead className="text-[11px]">Warehouse</TableHead>
                    <TableHead className="text-[11px] text-right">Qty Change</TableHead>
                    <TableHead className="text-[11px]">Reason</TableHead>
                    <TableHead className="text-[11px]">Adjusted By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((adj) => (
                    <TableRow key={adj.id}>
                      <TableCell className="text-xs text-muted-foreground">{adj.created_at}</TableCell>
                      <TableCell className="text-sm font-medium">{adj.product_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{adj.sku}</TableCell>
                      <TableCell className="text-xs">{adj.warehouse_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={adj.quantity > 0 ? "secondary" : "destructive"} className="text-[10px] font-mono">
                          {adj.quantity > 0 ? "+" : ""}{adj.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{adj.reason}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{adj.adjusted_by}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
