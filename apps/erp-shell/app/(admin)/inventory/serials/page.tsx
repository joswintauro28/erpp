"use client";

import { useState, useMemo } from "react";
import { Search, ScanBarcode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { SerialItem } from "@/types/inventory";

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

  const filtered = useMemo(() => {
    let res = serials;
    if (statusFilter) res = res.filter((s) => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(
        (s) =>
          s.serial_number.toLowerCase().includes(q) ||
          s.product_name.toLowerCase().includes(q) ||
          s.sku.toLowerCase().includes(q) ||
          s.customer.toLowerCase().includes(q)
      );
    }
    return res;
  }, [search, statusFilter]);

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
          <Input placeholder="Search by serial, product, SKU..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Sold Date</TableHead>
                <TableHead>Warranty Until</TableHead>
                <TableHead>Customer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs font-medium">{s.serial_number}</TableCell>
                  <TableCell className="text-sm font-medium">{s.product_name}</TableCell>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{s.sku}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs" style={{ borderColor: statusColors[s.status], color: statusColors[s.status] }}>
                      {statusLabels[s.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{s.warehouse}</TableCell>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{s.sold_date || "-"}</TableCell>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{s.warranty_until || "-"}</TableCell>
                  <TableCell className="text-xs text-[--shell-muted]">{s.customer || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
