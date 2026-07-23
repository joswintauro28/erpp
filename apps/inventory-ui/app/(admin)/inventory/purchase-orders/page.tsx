"use client";

import { useEffect, useState } from "react";
import { Plus, ClipboardList, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from "@/services/api";
import { money } from "@/utils/format";

interface PurchaseOrder {
  id: number;
  order_number: string;
  supplier_id: number;
  status: string;
  total: number;
  created_at: string;
}

const statusVariant = (s: string) => {
  if (s === "draft") return "outline" as const;
  if (s === "ordered") return "default" as const;
  if (s === "received") return "secondary" as const;
  if (s === "cancelled") return "destructive" as const;
  return "outline" as const;
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PurchaseOrder[]>("/purchase-orders").then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">Purchase Orders</h1>
          <p className="mt-1 text-sm text-[var(--shell-muted)]">{orders.length} orders</p>
        </div>
        <Button><Plus className="h-4 w-4" /> New Purchase Order</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No purchase orders yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-xs font-medium">{po.order_number}</TableCell>
                    <TableCell className="text-muted-foreground">#{po.supplier_id}</TableCell>
                    <TableCell><Badge variant={statusVariant(po.status)}>{po.status}</Badge></TableCell>
                    <TableCell>{money(po.total)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(po.created_at).toLocaleDateString()}</TableCell>
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
