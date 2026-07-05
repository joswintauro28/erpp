"use client";

import { useState, useMemo } from "react";
import { Search, Boxes } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Batch } from "@/types/inventory";

export default function Batches() {
  const [search, setSearch] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);

  const filtered = useMemo(() => {
    if (!search.trim()) return batches;
    const q = search.toLowerCase();
    return batches.filter(
      (b) =>
        b.batch_number.toLowerCase().includes(q) ||
        b.product_name.toLowerCase().includes(q) ||
        b.sku.toLowerCase().includes(q) ||
        b.warehouse.toLowerCase().includes(q)
    );
  }, [search]);

  const getExpiryStatus = (expiry: string) => {
    const diff = new Date(expiry).getTime() - new Date().getTime();
    const months = diff / (1000 * 60 * 60 * 24 * 30);
    if (months < 0) return { label: "Expired", color: "var(--shell-danger)" };
    if (months < 6) return { label: "Expiring Soon", color: "var(--chart-4)" };
    return { label: "Valid", color: "var(--shell-success)" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Batches
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Track inventory by batch and expiry
          </p>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
        <Input placeholder="Search batches..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Mfg Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Warehouse</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => {
                const expiry = getExpiryStatus(b.expiry_date);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs font-medium">{b.batch_number}</TableCell>
                    <TableCell className="text-sm font-medium">{b.product_name}</TableCell>
                    <TableCell className="font-mono text-xs text-[--shell-muted]">{b.sku}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{b.quantity.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs text-[--shell-muted]">{b.mfg_date}</TableCell>
                    <TableCell className="font-mono text-xs text-[--shell-muted]">{b.expiry_date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs" style={{ borderColor: expiry.color, color: expiry.color }}>
                        {expiry.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{b.warehouse}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
