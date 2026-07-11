"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from "@/services/api";
import { number } from "@/utils/format";

interface StockItem {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  reserved_quantity: number;
}

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<StockItem[]>("/stock").then(setStock).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = stock.filter((s) =>
    !search || s.product_id.toString().includes(search),
  );

  const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);
  const totalReserved = stock.reduce((sum, s) => sum + s.reserved_quantity, 0);
  const totalAvailable = totalStock - totalReserved;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">Stock Levels</h1>
        <p className="mt-1 text-sm text-[--shell-muted]">
          {number(totalStock)} units total &middot; {number(totalAvailable)} available &middot; {number(totalReserved)} reserved
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by product ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No stock records found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Warehouse ID</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">#{s.product_id}</TableCell>
                    <TableCell>#{s.warehouse_id}</TableCell>
                    <TableCell className="font-semibold">{number(s.quantity)}</TableCell>
                    <TableCell className="text-muted-foreground">{number(s.reserved_quantity)}</TableCell>
                    <TableCell>{number(s.quantity - s.reserved_quantity)}</TableCell>
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
