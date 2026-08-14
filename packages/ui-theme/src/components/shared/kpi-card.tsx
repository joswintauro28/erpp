import React from "react";
import { ArrowUp, ArrowDown, LucideIcon } from "lucide-react";

export interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { dir: "up" | "down"; pct: string };
  color?: string;
  index?: number;
  loading?: boolean;
}

export function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "var(--chart-1)",
  index = 0,
  loading = false,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 shadow-engineered">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-20 shimmer-glow rounded" />
          <div className="h-7 w-7 rounded-md shimmer-glow" />
        </div>
        <div className="h-7 w-28 shimmer-glow rounded mt-1" />
        <div className="h-3.5 w-24 shimmer-glow rounded" />
      </div>
    );
  }

  return (
    <div
      className="animate-kpi flex flex-col gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 hover:-translate-y-1 hover:shadow-engineered transition-all duration-300 relative overflow-hidden group backdrop-blur-sm"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover:w-1.5"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--shell-muted)]">
          {label}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--shell-border)] transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <span className="font-heading text-2xl font-bold tracking-tight text-[var(--shell-foreground)] mt-0.5">
        {value}
      </span>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${
              trend.dir === "up"
                ? "bg-[var(--shell-success)]/10 text-[var(--shell-success)] border border-[var(--shell-success)]/20"
                : "bg-[var(--shell-danger)]/10 text-[var(--shell-danger)] border border-[var(--shell-danger)]/20"
            }`}
          >
            {trend.dir === "up" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )}
            {trend.pct}
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-[var(--shell-muted)] font-medium">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
