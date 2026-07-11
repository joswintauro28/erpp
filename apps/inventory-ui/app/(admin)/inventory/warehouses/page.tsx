"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from "@/services/api";

interface Warehouse {
  id: number;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  is_active: boolean;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Warehouse[]>("/warehouses").then(setWarehouses).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">Warehouses</h1>
          <p className="mt-1 text-sm text-[--shell-muted]">{warehouses.length} locations</p>
        </div>
        <Button><Plus className="h-4 w-4" /> Add Warehouse</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : warehouses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No warehouses found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{w.code}</TableCell>
                    <TableCell>{w.city || "-"}</TableCell>
                    <TableCell>{w.state || "-"}</TableCell>
                    <TableCell><Badge variant={w.is_active ? "default" : "secondary"}>{w.is_active ? "Active" : "Inactive"}</Badge></TableCell>
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
