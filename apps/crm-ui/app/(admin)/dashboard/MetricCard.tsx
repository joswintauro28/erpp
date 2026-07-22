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
      className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[--shell-border] bg-[--shell-surface] p-5 hover:-translate-y-1 hover:shadow-engineered"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[--shell-border] bg-[--shell-bg]">
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
      </div>
      <span className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{value}</span>
      <div className="flex items-center gap-2">
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trend.dir === "up" ? "text-[--shell-success]" : "text-[--shell-danger]"}`}>
            {trend.dir === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {trend.pct}
          </span>
        )}
        {subtitle && <span className="text-xs text-[--shell-muted]">{subtitle}</span>}
      </div>
    </div>
  );
}
