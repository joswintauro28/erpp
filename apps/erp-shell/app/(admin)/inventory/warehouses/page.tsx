"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import type { ApiWarehouse } from "@/types/inventory";

export default function Warehouses() {
  const [search, setSearch] = useState("");
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get<ApiWarehouse[]>("/warehouses")
      .then((data) => { if (!cancelled) setWarehouses(data); })
      .catch(() => { if (!cancelled) setWarehouses([]); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return warehouses;
    const q = search.toLowerCase();
    return warehouses.filter(
      (w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q)
    );
  }, [warehouses, search]);

  if (ready && warehouses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Warehouses</h1>
            <p className="mt-0.5 text-sm text-[--shell-muted]">Manage warehouse locations</p>
          </div>
          <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Warehouse</Button>
        </div>
        <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
          <MapPin className="h-12 w-12" />
          <p className="text-base font-medium text-[--shell-foreground]">No warehouses yet</p>
          <p className="text-sm">Add your first warehouse to start tracking inventory locations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Warehouses
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Manage warehouse locations
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Warehouse
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
        <Input placeholder="Search warehouses..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((w) => (
          <Card key={w.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[--shell-action]" />
                    <h3 className="font-heading text-sm font-semibold text-[--shell-foreground]">{w.name}</h3>
                  </div>
                  <p className="mt-0.5 text-xs text-[--shell-muted] font-mono">{w.code}</p>
                  <p className="mt-1 text-xs text-[--shell-muted]">
                    {[w.address, w.city, w.state, w.country].filter(Boolean).join(", ") || "No address"}
                  </p>
                </div>
                <Badge variant={w.is_active ? "default" : "secondary"} className="text-xs">
                  {w.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
