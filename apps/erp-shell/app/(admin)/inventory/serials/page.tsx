"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ScanBarcode, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";

interface SerialItem {
  id: number; serial_number: string; product_id: number;
  status: "in_stock" | "sold" | "returned" | "warranty" | "scrapped";
  warehouse_id: number; purchase_order_id: number | null;
}

const statusColors: Record<string, string> = {
  in_stock: "var(--shell-success)",
  sold: "var(--chart-3)",
  returned: "var(--chart-4)",
  warranty: "var(--chart-2)",
  scrapped: "var(--shell-danger)",
};

const statusLabels: Record<string, string> = {
  in_stock: "In Stock",
  sold: "Sold",
  returned: "Returned",
  warranty: "Warranty",
  scrapped: "Scrapped",
};

export default function Serials() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [serials, setSerials] = useState<SerialItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any[]>("/serial-numbers")
      .then((data) => setSerials(data.map((s) => ({
        id: s.id, serial_number: s.serial_number,
        product_id: s.product_id,
        status: s.status as SerialItem["status"],
        warehouse_id: s.warehouse_id,
        purchase_order_id: s.purchase_order_id ?? null,
      }))))
      .catch(() => setSerials([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let res = serials;
    if (statusFilter) res = res.filter((s) => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter((s) => s.serial_number.toLowerCase().includes(q));
    }
    return res;
  }, [serials, search, statusFilter]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[--shell-muted]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Serials
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Serial number tracking for inventory items
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
          <Input placeholder="Search by serial number..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {["", "in_stock", "sold", "returned", "warranty", "scrapped"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="text-xs capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s ? statusLabels[s] : "All"}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
              <ScanBarcode className="h-12 w-12" />
              <p className="text-base font-medium text-[--shell-foreground]">
                {serials.length === 0 ? "No serial numbers yet" : "No serials match your search"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial #</TableHead>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Warehouse ID</TableHead>
                  <TableHead>PO Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs font-medium">{s.serial_number}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">#{s.product_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs" style={{ borderColor: statusColors[s.status], color: statusColors[s.status] }}>
                        {statusLabels[s.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">#{s.warehouse_id}</TableCell>
                    <TableCell className="font-mono text-xs text-[--shell-muted]">{s.purchase_order_id ? `PO-${s.purchase_order_id}` : "-"}</TableCell>
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
