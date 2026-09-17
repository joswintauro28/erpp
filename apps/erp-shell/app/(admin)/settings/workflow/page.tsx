"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Play, Pause, Power, PowerOff, Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@datavex/ui-theme";

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
    <div className="relative space-y-6">
      {/* Brand Sweep Line */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-primary shimmer-glow" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Workflow Automation
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Define automated rules and triggers
          </p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-white shadow">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Rule
        </Button>
      </div>

      {/* Dashboard-Aligned KPI Grid */}
      <div className="grid grid-cols-3 gap-6">
        <KpiCard label="Active Rules" value={rules.filter((r) => r.is_active).length} subtitle="Running active triggers" icon={Play} color="var(--shell-accent)" index={0} />
        <KpiCard label="Paused Rules" value={rules.filter((r) => !r.is_active).length} subtitle="Temporarily deactivated" icon={Pause} color="var(--shell-muted)" index={1} />
        <KpiCard label="Total Configured" value={rules.length} subtitle="Total automation rules" icon={Repeat} color="var(--shell-brand)" index={2} />
      </div>

      {/* Search and Filters */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Search rules..." 
          className="pl-8 bg-muted/10 focus:bg-muted/20 border-border text-sm text-foreground" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>

      {/* Rules Registry Table */}
      <Card className="border-border hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
              <Repeat className="h-12 w-12 text-primary/60" />
              <p className="text-base font-medium text-foreground">No workflow rules yet</p>
              <p className="text-sm">Create automation triggers to handle alerts, emails, and updates.</p>
              <Button size="sm" className="mt-2 bg-primary hover:bg-primary/90 text-white shadow">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40 hover:bg-transparent">
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Rule Name</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Trigger</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Condition</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Action</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Last Run</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-16 text-right">Toggle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                    <TableCell className="text-sm font-semibold text-foreground">{r.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{r.trigger}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{r.condition}</TableCell>
                    <TableCell className="text-xs text-foreground font-medium">{r.action}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.last_run}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={r.is_active ? "default" : "outline"} 
                        className={`text-[10px] font-semibold ${
                          r.is_active 
                            ? "bg-[var(--shell-accent)]/10 text-[var(--shell-accent)] border-[var(--shell-accent)]/20" 
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        onClick={() => toggleActive(r.id)}
                        className="hover:bg-secondary"
                      >
                        {r.is_active ? (
                          <Power className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
                        ) : (
                          <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
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
