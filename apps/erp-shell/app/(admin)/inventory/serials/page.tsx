"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ScanBarcode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import type { ApiSerialNumber } from "@/types/inventory";
import SerialsLoading from "./loading";

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
  const [serials, setSerials] = useState<ApiSerialNumber[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get<ApiSerialNumber[]>("/serial-numbers")
      .then((data) => { if (!cancelled) setSerials(data); })
      .catch(() => { if (!cancelled) setSerials([]); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
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

  if (!ready) {
    return <SerialsLoading />;
  }

  if (ready && serials.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">Serial Numbers</h1>
            <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Serial number tracking for inventory items</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
          <ScanBarcode className="h-12 w-12" />
          <p className="text-base font-medium text-[var(--shell-foreground)]">No serial numbers yet</p>
          <p className="text-sm">Serial numbers are created when products with serial tracking are received.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Serial Numbers
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Serial number tracking for inventory items
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
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
            <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
              <ScanBarcode className="h-12 w-12" />
              <p className="text-base font-medium text-[var(--shell-foreground)]">
                {serials.length === 0 ? "No serial numbers yet" : "No serials match your search"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial #</TableHead>
                  <TableHead className="text-right">Product ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Warehouse ID</TableHead>
                  <TableHead>PO Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs font-medium">{s.serial_number}</TableCell>
                    <TableCell className="font-mono text-xs text-right text-[var(--shell-muted)]">#{s.product_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs" style={{ borderColor: statusColors[s.status], color: statusColors[s.status] }}>
                        {statusLabels[s.status] || s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-right text-[var(--shell-muted)]">#{s.warehouse_id}</TableCell>
                    <TableCell className="font-mono text-xs text-[var(--shell-muted)]">
                      {s.purchase_order_id ? `PO-${s.purchase_order_id}` : "-"}
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
