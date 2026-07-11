"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from "@/services/api";

interface Movement {
  id: number;
  product_id: number;
  product_name?: string;
  type: string;
  quantity: number;
  notes: string | null;
  created_at: string;
}

const typeVariant = (type: string) => {
  if (type === "in") return "default" as const;
  if (type === "out") return "destructive" as const;
  return "secondary" as const;
};

const typeLabel = (type: string) => {
  if (type === "in") return "In";
  if (type === "out") return "Out";
  return "Adjustment";
};

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Movement[]>("/stock/movements?limit=100").then(setMovements).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">Stock Movements</h1>
        <p className="mt-1 text-sm text-[--shell-muted]">{movements.length} recorded movements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-accent" />
            Movement Log
          </CardTitle>
          <CardDescription>All stock in/out/adjustment activity</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No movements recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">#{m.product_id}</TableCell>
                    <TableCell><Badge variant={typeVariant(m.type)}>{typeLabel(m.type)}</Badge></TableCell>
                    <TableCell className={m.quantity > 0 ? "text-green-500" : "text-red-500"}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{m.notes || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</TableCell>
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
