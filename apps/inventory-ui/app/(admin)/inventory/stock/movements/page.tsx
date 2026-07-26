"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Loader2, ArrowUpRight, ArrowDownLeft, SlidersHorizontal } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from "@/services/api";

interface Movement {
  id: number;
  product_id: number;
  warehouse_id: number;
  product_name?: string;
  sku?: string;
  warehouse_name?: string;
  type: string;
  quantity: number;
  notes: string | null;
  created_at: string;
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Movement[]>("/stock/movements?limit=100")
      .then(setMovements)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getTypeBadge = (type: string) => {
    const t = type.toLowerCase();
    if (t === "in") {
      return (
        <Badge className="bg-emerald-600 text-white flex items-center gap-1 text-[11px] w-fit">
          <ArrowDownLeft className="h-3 w-3" /> Goods Receipt (IN)
        </Badge>
      );
    }
    if (t === "out") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1 text-[11px] w-fit">
          <ArrowUpRight className="h-3 w-3" /> Order Dispatch (OUT)
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1 text-[11px] w-fit">
        <SlidersHorizontal className="h-3 w-3" /> Audit Adjustment
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground] flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6 text-[#8C1D24]" />
          Stock Movement Log & Inventory Audit
        </h1>
        <p className="mt-1 text-sm text-[--shell-muted]">
          Every stock transaction logged automatically from customer order dispatches, supplier receipts, and physical audits.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-[#8C1D24]" /> Recent Transactions ({movements.length})
          </CardTitle>
          <CardDescription>Comprehensive audit log of all stock movements</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No stock movements logged yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase">
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse Location</TableHead>
                  <TableHead>Movement Type</TableHead>
                  <TableHead className="text-right">Quantity Change</TableHead>
                  <TableHead>Reference / Notes</TableHead>
                  <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-semibold text-foreground">
                      {m.product_name || `Product #${m.product_id}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{m.sku || "N/A"}</TableCell>
                    <TableCell className="text-xs font-medium">
                      {m.warehouse_name || `Warehouse #${m.warehouse_id}`}
                    </TableCell>
                    <TableCell>{getTypeBadge(m.type)}</TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={m.quantity > 0 ? "text-emerald-600" : "text-destructive"}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">
                      {m.notes || "System update"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right">
                      {new Date(m.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
