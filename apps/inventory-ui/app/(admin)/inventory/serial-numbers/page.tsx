"use client";

import { useEffect, useState } from "react";
import { ScanBarcode, Loader2, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from "@/services/api";

interface SerialNumber {
  id: number;
  product_id: number;
  warehouse_id: number;
  serial_number: string;
  status: string;
  created_at: string;
}

const statusVariant = (s: string) => {
  if (s === "in_stock") return "default" as const;
  if (s === "sold") return "secondary" as const;
  if (s === "returned") return "destructive" as const;
  return "outline" as const;
};

export default function SerialNumbersPage() {
  const [serials, setSerials] = useState<SerialNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<SerialNumber[]>("/serial-numbers").then(setSerials).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = serials.filter((s) =>
    !search || s.serial_number.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">Serial Numbers</h1>
        <p className="mt-1 text-sm text-[var(--shell-muted)]">{serials.length} tracked serials</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanBarcode className="h-4 w-4 text-accent" />
            Serial Tracking
          </CardTitle>
          <CardDescription>Track individual units by serial number</CardDescription>
          <div className="relative w-full max-w-xs mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search serial number..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No serial numbers found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Warehouse ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs font-medium">{s.serial_number}</TableCell>
                    <TableCell>#{s.product_id}</TableCell>
                    <TableCell>#{s.warehouse_id}</TableCell>
                    <TableCell><Badge variant={statusVariant(s.status)}>{s.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
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
