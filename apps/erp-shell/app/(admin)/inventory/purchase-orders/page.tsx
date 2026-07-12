"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, ShoppingCart, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { money } from "@/utils/format";
import { api } from "@/services/api";
import type { ApiPurchaseOrder } from "@/types/inventory";

const statusColors: Record<string, string> = {
  draft: "var(--chart-4)",
  ordered: "var(--chart-3)",
  received: "var(--shell-success)",
};

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<ApiPurchaseOrder[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get<ApiPurchaseOrder[]>("/purchase-orders")
      .then((data) => { if (!cancelled) setOrders(data); })
      .catch(() => { if (!cancelled) setOrders([]); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let res = orders;
    if (statusFilter) res = res.filter((o) => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(
        (o) => o.order_number.toLowerCase().includes(q) || `#${o.supplier_id}`.includes(q) || (o.notes ?? "").toLowerCase().includes(q)
      );
    }
    return res;
  }, [orders, search, statusFilter]);

  if (ready && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Purchase Orders</h1>
            <p className="mt-0.5 text-sm text-[--shell-muted]">Manage purchase orders and supplier deliveries</p>
          </div>
          <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />New PO</Button>
        </div>
        <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
          <ShoppingCart className="h-12 w-12" />
          <p className="text-base font-medium text-[--shell-foreground]">No purchase orders yet</p>
          <p className="text-sm">Create your first purchase order to start tracking procurement.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Purchase Orders
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Manage purchase orders and supplier deliveries
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New PO
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
          <Input placeholder="Search POs..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {["", "draft", "ordered", "received"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="text-xs capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s || "All"}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-[--shell-muted]">
              <p className="text-sm">No purchase orders match your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier ID</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs font-medium">{o.order_number}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">#{o.supplier_id}</TableCell>
                    <TableCell className="font-mono text-xs text-[--shell-muted]">
                      {o.ordered_at ? o.ordered_at.split("T")[0] : o.created_at.split("T")[0]}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[--shell-muted]">
                      {o.expected_at ? o.expected_at.split("T")[0] : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-right">{o.items.length}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(o.total)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize" style={{ borderColor: statusColors[o.status], color: statusColors[o.status] }}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm"><Eye className="h-3.5 w-3.5" /></Button>
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
