"use client";

import { TrendingUp, ArrowUp, ArrowDown } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: typeof TrendingUp;
  trend?: { dir: "up" | "down"; pct: string };
  color?: string;
  index?: number;
}

export default function MetricCard({ label, value, subtitle, icon: Icon = TrendingUp, trend, color = "var(--chart-1)", index = 0 }: MetricCardProps) {
  return (
    <div
      className="animate-kpi flex flex-col gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 hover:-translate-y-1 hover:shadow-engineered transition-all duration-300 relative overflow-hidden group"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <span 
        className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover:w-1.5"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--shell-muted)]">{label}</span>
        <div 
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--shell-border)] transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}10`, borderColor: `${color}25` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <span className="font-heading text-3xl font-bold tracking-tight text-[var(--shell-foreground)] mt-1">{value}</span>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${trend.dir === "up" ? "bg-[var(--shell-success)]/10 text-[var(--shell-success)]" : "bg-[var(--shell-danger)]/10 text-[var(--shell-danger)]"}`}>
            {trend.dir === "up" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
            {trend.pct}
          </span>
        )}
        {subtitle && <span className="text-xs text-[var(--shell-muted)] font-medium">{subtitle}</span>}
      </div>
    </div>
  );
}
