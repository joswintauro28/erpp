"use client";

import { useState } from "react";
import { GripVertical, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import { toastError, errorMessage } from "@/utils/toast";
import { cn } from "@/lib/utils";

export const PIPELINE_STAGES = ["Discovery", "Quote", "Negotiation", "Won", "Lost"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

const STAGE_META: Record<PipelineStage, { color: string; dot: string; label: string }> = {
  Discovery: { color: "bg-muted text-muted-foreground border-border", dot: "bg-[var(--shell-muted)]", label: "Discovery" },
  Quote: { color: "bg-[var(--shell-info-surface)] text-[var(--shell-info)] border-[var(--shell-info)]/30", dot: "bg-[var(--shell-info-surface)]", label: "Quote" },
  Negotiation: { color: "bg-[var(--shell-warning-surface)] text-[var(--shell-warning)] border-[var(--shell-warning)]/30", dot: "bg-[var(--shell-warning)]", label: "Negotiation" },
  Won: { color: "bg-[var(--shell-success-surface)] text-[var(--shell-success)] border-[var(--shell-success)]/30", dot: "bg-[var(--shell-success-surface)]", label: "Closed Won" },
  Lost: { color: "bg-[var(--shell-danger-surface)] text-[var(--shell-danger)] border-[var(--shell-danger)]/30", dot: "bg-[var(--shell-danger-surface)]", label: "Lost" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

interface OpportunityKanbanProps {
  opportunities: any[];
  onView: (record: any) => void;
  onStageChange: () => void;
}

export default function OpportunityKanban({ opportunities, onView, onStageChange }: OpportunityKanbanProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<PipelineStage | null>(null);
  const [busyStage, setBusyStage] = useState<string | null>(null);

  const handleDrop = async (stage: PipelineStage, e: React.DragEvent) => {
    e.preventDefault();
    setOverStage(null);
    if (!dragId) return;
    setBusyStage(dragId);
    try {
      await api.post(`/crm/opportunities/${dragId}/stage`, { stage });
      if (onStageChange) onStageChange();
    } catch (err) {
      toastError("Stage update failed", errorMessage(err));
    } finally {
      setBusyStage(null);
      setDragId(null);
    }
  };

  const totalFor = (stage: PipelineStage) =>
    opportunities
      .filter((o) => (o.stage || "Discovery") === stage)
      .reduce((sum, o) => sum + (Number(String(o.value || 0).replace(/[^0-9.]/g, "")) || 0), 0);

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 min-h-[320px]">
      {PIPELINE_STAGES.map((stage) => {
        const meta = STAGE_META[stage];
        const cards = opportunities.filter((o) => (o.stage || "Discovery") === stage);
        const isOver = overStage === stage;
        return (
          <div
            key={stage}
            onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
            onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
            onDrop={(e) => handleDrop(stage, e)}
            className={cn(
              "flex w-[240px] shrink-0 flex-col rounded-xl border transition-all duration-150",
              isOver ? "border-[var(--shell-warning)]/40 ring-2 ring-[var(--shell-warning)]/60" : "border-border"
            )}
          >
            <div className={cn("flex items-center justify-between rounded-t-xl border-b px-3 py-2.5", meta.color)}>
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                <span className="text-xs font-bold uppercase tracking-wide">{meta.label}</span>
                <span className="rounded-full bg-card/70 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">{cards.length}</span>
              </div>
              <span className="text-[10px] font-semibold tabular-nums opacity-80">{formatCurrency(totalFor(stage))}</span>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-2">
              {cards.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-4 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Drop here
                </div>
              )}
              {cards.map((o: any) => {
                const isDragging = dragId === o.id_str;
                const isBusy = busyStage === o.id_str;
                return (
                  <div
                    key={o.id}
                    draggable
                    onDragStart={() => setDragId(o.id_str)}
                    onDragEnd={() => { setDragId(null); setOverStage(null); }}
                    onClick={() => onView(o)}
                    className={cn(
                      "group cursor-grab rounded-lg border border-border bg-card p-2.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:cursor-grabbing",
                      isDragging && "opacity-40",
                      isBusy && "opacity-60"
                    )}
                    title={`${o.name} — drag to move stage`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-1">
                      <p className="m-0 text-xs font-semibold text-foreground leading-snug">{o.name}</p>
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="m-0 text-[10px] text-muted-foreground">{o.account}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-bold tabular-nums">{formatCurrency(o.value)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{o.probability || "20%"}</span>
                        {stage === "Won" ? (
                          <Unlock className="h-3 w-3 text-[var(--shell-success)]" />
                        ) : (
                          <Lock className="h-3 w-3 text-muted-foreground/50" />
                        )}
                      </div>
                    </div>
                    {o.discovery_notes && (
                      <p className="mt-1.5 line-clamp-2 m-0 border-t border-dashed border-border pt-1 text-[10px] italic text-muted-foreground">
                        {o.discovery_notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
