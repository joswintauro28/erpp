"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Play, Pause, Power, PowerOff, Repeat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import type { WorkflowRule } from "@/types/settings";

export default function WorkflowAutomation() {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return rules;
    const q = search.toLowerCase();
    return rules.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.trigger.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q)
    );
  }, [rules, search]);

  const toggleActive = (id: number) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Workflow Automation
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Define automated rules and triggers
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Rule
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Active Rules</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-success]">{rules.filter((r) => r.is_active).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Inactive Rules</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-muted]">{rules.filter((r) => !r.is_active).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Total Rules</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{rules.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
        <Input placeholder="Search rules..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16 text-right">Toggle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.trigger}</Badge></TableCell>
                  <TableCell className="text-xs text-[--shell-muted] max-w-xs truncate">{r.condition}</TableCell>
                  <TableCell className="text-xs text-[--shell-foreground]">{r.action}</TableCell>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{r.last_run}</TableCell>
                  <TableCell>
                    <Badge variant={r.is_active ? "default" : "secondary"} className="text-xs">
                      {r.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => toggleActive(r.id)}>
                      {r.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
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
