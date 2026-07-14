"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Play, Pause, Power, PowerOff, Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="relative space-y-6">
      {/* Brand Sweep Line */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[#8C1D24] shimmer-glow" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Workflow Automation
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Define automated rules and triggers
          </p>
        </div>
        <Button size="sm" className="bg-[#8C1D24] hover:bg-[#8C1D24]/90 text-white shadow">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Rule
        </Button>
      </div>

      {/* Dashboard-Aligned KPI Grid */}
      <div className="grid grid-cols-3 gap-6">
        {[
          {
            label: "Active Rules",
            value: String(rules.filter((r) => r.is_active).length),
            subtitle: "Running active triggers",
            icon: Play,
            color: "#E5B83C", // Milled Gold
            index: 0,
          },
          {
            label: "Paused Rules",
            value: String(rules.filter((r) => !r.is_active).length),
            subtitle: "Temporarily deactivated",
            icon: Pause,
            color: "var(--shell-muted)",
            index: 1,
          },
          {
            label: "Total Configured",
            value: String(rules.length),
            subtitle: "Total automation rules",
            icon: Repeat,
            color: "#8C1D24", // Crimson Red
            index: 2,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            style={{ animationDelay: `${kpi.index * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">
                {kpi.label}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--shell-border)]/40 bg-[var(--shell-surface-alt)]">
                <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
              </div>
            </div>
            <span className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">
              {kpi.value}
            </span>
            <span className="text-xs text-[var(--shell-muted)]">{kpi.subtitle}</span>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
        <Input 
          placeholder="Search rules..." 
          className="pl-8 bg-muted/10 focus:bg-muted/20 border-[var(--shell-border)] text-sm text-[var(--shell-foreground)]" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>

      {/* Rules Registry Table */}
      <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)] hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
              <Repeat className="h-12 w-12 text-[#8C1D24]/60" />
              <p className="text-base font-medium text-[var(--shell-foreground)]">No workflow rules yet</p>
              <p className="text-sm">Create automation triggers to handle alerts, emails, and updates.</p>
              <Button size="sm" className="mt-2 bg-[#8C1D24] hover:bg-[#8C1D24]/90 text-white shadow">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[var(--shell-border)]/40 hover:bg-transparent">
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Rule Name</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Trigger</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Condition</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Action</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Last Run</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Status</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] w-16 text-right">Toggle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="border-b border-[var(--shell-border)]/40 hover:bg-[var(--shell-surface-alt)]/30 transition-colors">
                    <TableCell className="text-sm font-semibold text-[var(--shell-foreground)]">{r.name}</TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)] font-mono">{r.trigger}</TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)] max-w-xs truncate">{r.condition}</TableCell>
                    <TableCell className="text-xs text-[var(--shell-foreground)] font-medium">{r.action}</TableCell>
                    <TableCell className="font-mono text-xs text-[var(--shell-muted)]">{r.last_run}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={r.is_active ? "default" : "outline"} 
                        className={`text-[10px] font-semibold ${
                          r.is_active 
                            ? "bg-[#E5B83C]/10 text-[#E5B83C] border-[#E5B83C]/20" 
                            : "border-[var(--shell-border)] text-[var(--shell-muted)]"
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
                        className="hover:bg-[var(--shell-surface-alt)]"
                      >
                        {r.is_active ? (
                          <Power className="h-3.5 w-3.5 text-[#E5B83C]" />
                        ) : (
                          <PowerOff className="h-3.5 w-3.5 text-[var(--shell-muted)]" />
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
