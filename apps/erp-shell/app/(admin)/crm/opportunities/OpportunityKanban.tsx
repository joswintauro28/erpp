"use client";

import { useState, useCallback, useMemo } from "react";
import { Droplets, TrendingUp, Target, AlertTriangle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Opportunity {
  id: number;
  id_str: string;
  name: string;
  account: string | null;
  stage: string;
  value: number;
  probability: number;
  owner: string;
  close_date: string;
  notes: string | null;
}

interface OpportunityKanbanProps {
  opportunities: Opportunity[];
  onView: (rec: Opportunity) => void;
  onStageChange: () => void;
}

const STAGE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  "Discovery": { color: "#6366f1", bg: "bg-indigo-500/10", label: "Discovery" },
  "Needs Analysis": { color: "#8b5cf6", bg: "bg-purple-500/10", label: "Needs Analysis" },
  "Proposal": { color: "#f59e0b", bg: "bg-amber-500/10", label: "Proposal" },
  "Negotiation": { color: "#10b981", bg: "bg-emerald-500/10", label: "Negotiation" },
  "Closed Won": { color: "#10b981", bg: "bg-emerald-500/10", label: "Closed Won" },
  "Closed Lost": { color: "#ef4444", bg: "bg-red-500/10", label: "Closed Lost" },
};

const INITIAL_STAGES = ["Discovery", "Needs Analysis"];

interface StageState {
  stage: string;
  items: Opportunity[];
}

export default function OpportunityKanban({ opportunities: initialOpps, onView, onStageChange }: OpportunityKanbanProps) {
  const [stages, setStages] = useState<StageState[]>(() => {
    const grouped = initialOpps.reduce<Record<string, Opportunity[]>>((acc, opp) => {
      const s = opp.stage || "Discovery";
      if (!acc[s]) acc[s] = [];
      acc[s].push(opp);
      return acc;
    }, {});

    const allStages = Array.from(new Set([...Object.keys(grouped), ...INITIAL_STAGES]));
    return allStages.map((stage) => ({
      stage,
      items: grouped[stage] || [],
    }));
  });

  const handleDragStart = useCallback((e: React.DragEvent, opp: Opportunity) => {
    e.dataTransfer.setData("application/json", JSON.stringify(opp));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;

    let opp: Opportunity;
    try { opp = JSON.parse(raw); } catch { return; }

    const sourceIdx = stages.findIndex((s) => s.stage === opp.stage);
    const targetIdx = stages.findIndex((s) => s.stage === targetStage);

    if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) return;

    setStages((prev) =>
      prev.map((s, idx) => {
        if (idx === sourceIdx) return { ...s, items: s.items.filter((o) => o.id !== opp.id) };
        if (idx === targetIdx) return { ...s, items: [...s.items, { ...opp, stage: targetStage }] };
        return s;
      })
    );
    onStageChange();
  }, [stages, onStageChange]);

  const columns = useMemo(() => stages.map((s) => ({
    id: s.stage,
    title: s.stage,
    color: STAGE_CONFIG[s.stage]?.color || "#6b7280",
    bg: STAGE_CONFIG[s.stage]?.bg || "bg-gray-500/10",
    items: s.items,
    total: s.items.length,
  })), [stages]);

  const totalValue = useMemo(() => {
    return initialOpps.reduce((sum, opp) => sum + (opp.value || 0), 0);
  }, [initialOpps]);

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-[var(--shell-surface)] rounded-lg border border-[var(--shell-border)] px-4 py-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[var(--shell-muted)]">Pipeline:</span>
          <span className="font-heading font-semibold text-[var(--shell-foreground)]">
            {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalValue)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {columns.map((col) => (
            <div key={col.id} className="flex items-center gap-1.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
              <span className="text-[var(--shell-muted)]">{col.title}:</span>
              <span className="font-medium text-[var(--shell-foreground)]">{col.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {columns.map((col) => (
          <div
            key={col.id}
            className={cn(
              "flex flex-col min-w-[280px] flex-1 rounded-xl border transition-colors",
              col.items.length > 0 ? "bg-[var(--shell-surface)] border-[var(--shell-border)]" : "bg-muted/30 border-dashed border-[var(--shell-border)]/50"
            )}
          >
            {/* Column Header */}
            <div className={cn("flex items-center gap-2 px-3 py-3 border-b", col.items.length > 0 ? "border-[var(--shell-border)]" : "border-transparent")}>
              <span className={cn("h-3 w-3 rounded-full", col.bg)} style={{ background: col.color }} />
              <span className="text-sm font-semibold text-[var(--shell-foreground)]">{col.title}</span>
              <span className="ml-auto text-xs font-mono text-[var(--shell-muted)] bg-[var(--shell-border)]/20 px-2 py-0.5 rounded-full">
                {col.total}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-3 p-3 min-h-[200px] overflow-y-auto custom-scrollbar">
              {col.items.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-[var(--shell-muted)] border border-dashed border-[var(--shell-border)]/50 rounded-lg">
                  <Droplets className="h-4 w-4 mr-1 opacity-50" /> No opportunities
                </div>
              ) : (
                col.items.map((opp) => (
                  <div
                    key={opp.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, opp)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                    onClick={() => onView(opp)}
                    className="group relative rounded-lg border border-[var(--shell-border)]/60 bg-[var(--shell-bg)] p-3 cursor-pointer transition-all hover:border-[var(--shell-brand)]/40 hover:shadow-sm cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--shell-foreground)] truncate">{opp.name}</p>
                        <p className="text-xs text-[var(--shell-muted)] mt-0.5 truncate">{opp.account || "No account"}</p>
                      </div>
                      <span className="shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--shell-brand)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--shell-brand)]">
                          <Target className="h-2.5 w-2.5" />
                          {opp.probability}%
                        </span>
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-[var(--shell-foreground)]">
                        {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(opp.value)}
                      </span>
                      <span className="text-[10px] text-[var(--shell-muted)]">{opp.close_date}</span>
                    </div>

                    {/* Owner Badge */}
                    {opp.owner && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--shell-muted)]">
                        <div className="h-5 w-5 rounded-full bg-[var(--shell-border)] flex items-center justify-center text-[9px] font-bold text-[var(--shell-foreground)]">
                          {opp.owner.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{opp.owner}</span>
                      </div>
                    )}

                    {/* Drag indicator */}
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[var(--shell-brand)]/40 via-transparent to-[var(--shell-brand)]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
