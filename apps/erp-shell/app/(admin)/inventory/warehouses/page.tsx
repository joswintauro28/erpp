"use client";

import { useState } from "react";
import { Search, Plus, Pencil, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import type { Warehouse } from "@/types/inventory";

export default function Warehouses() {
  const [search, setSearch] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const filtered = warehouses.filter((w) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      w.location.toLowerCase().includes(q) ||
      w.manager.toLowerCase().includes(q)
    );
  });

  const totalCapacity = warehouses.reduce((s, w) => s + w.capacity, 0);
  const totalUsed = warehouses.reduce((s, w) => s + w.used, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Warehouses
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Manage warehouse locations and capacity
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Warehouse
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Total Warehouses</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{warehouses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Total Capacity</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{totalCapacity.toLocaleString()} units</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Total Used</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{totalUsed.toLocaleString()} units</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Utilization</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{((totalUsed / totalCapacity) * 100).toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((w) => {
          const pct = Math.round((w.used / w.capacity) * 100);
          return (
            <Card key={w.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[--shell-action]" />
                      <h3 className="font-heading text-sm font-semibold text-[--shell-foreground]">{w.name}</h3>
                    </div>
                    <p className="mt-0.5 text-xs text-[--shell-muted]">{w.location}</p>
                  </div>
                  <Badge variant={w.is_active ? "default" : "secondary"} className="text-xs">
                    {w.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[--shell-muted]">Capacity</span>
                    <span className="font-mono text-[--shell-foreground]">{w.used.toLocaleString()} / {w.capacity.toLocaleString()}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between text-xs text-[--shell-muted]">
                  <span>Manager: <span className="text-[--shell-foreground]">{w.manager}</span></span>
                  <span>{w.contact}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
