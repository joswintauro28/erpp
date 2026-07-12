"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Pencil, Truck, Power, PowerOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { api } from "@/services/api";
import type { Supplier } from "@/types/inventory";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<any[]>("/suppliers")
      .then((data) => setSuppliers(data.map((s) => ({
        id: s.id, name: s.name,
        contact_person: s.contact_person ?? "",
        email: s.email ?? "", phone: s.phone ?? "",
        gst_number: s.gst_number ?? "", state: s.state ?? "",
        address: s.address ?? "", payment_terms: s.payment_terms ?? "",
        supply_categories: [], is_active: s.is_active,
      }))))
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.contact_person.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.gst_number.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const toggleActive = (id: number) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s))
    );
  };

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
            Suppliers
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Manage vendor and supplier information
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Supplier
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
        <Input placeholder="Search suppliers..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>GST #</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead className="w-16">Status</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm font-medium">{s.name}</TableCell>
                  <TableCell className="text-xs text-[--shell-muted]">{s.contact_person}</TableCell>
                  <TableCell className="text-xs">{s.email}</TableCell>
                  <TableCell className="font-mono text-xs">{s.phone}</TableCell>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{s.gst_number}</TableCell>
                  <TableCell className="text-xs">{s.state}</TableCell>
                  <TableCell className="text-xs text-[--shell-muted]">{s.payment_terms}</TableCell>
                  <TableCell className="text-xs text-[--shell-muted]">-</TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm"><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => toggleActive(s.id)}>
                        {s.is_active ? <PowerOff className="h-3 w-3 text-[--shell-muted]" /> : <Power className="h-3 w-3 text-[--shell-success]" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
