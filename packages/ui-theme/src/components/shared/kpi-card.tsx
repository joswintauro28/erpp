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
  active?: boolean;
  onClick?: () => void;
}

/** Maps a CSS color to a subtle gradient background class */
function gradientBg(color: string): string {
  if (color.includes("danger") || color.includes("destructive")) return "from-[var(--shell-danger)]/5";
  if (color.includes("success")) return "from-[var(--shell-success)]/5";
  if (color.includes("chart-1")) return "from-[var(--chart-1)]/5";
  if (color.includes("chart-2")) return "from-[var(--chart-2)]/5";
  if (color.includes("chart-3")) return "from-[var(--chart-3)]/5";
  if (color.includes("chart-4")) return "from-[var(--chart-4)]/5";
  if (color.includes("chart-5")) return "from-[var(--chart-5)]/5";
  return "from-[var(--shell-muted)]/5";
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
  active = false,
  onClick,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border p-5 shadow-engineered">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-20 shimmer-glow rounded" />
          <div className="h-7 w-7 rounded-md shimmer-glow" />
        </div>
        <div className="h-7 w-28 shimmer-glow rounded mt-1" />
        <div className="h-3.5 w-24 shimmer-glow rounded" />
      </div>
    );
  }

  const gradient = gradientBg(color);

  return (
    <div
      className={`animate-kpi relative flex flex-col gap-1.5 rounded-xl border p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] overflow-hidden group backdrop-blur-sm ${
        active
          ? "border-[var(--shell-brand)] bg-secondary/50 ring-1 ring-[var(--shell-brand)]"
          : "border-border"
      } ${onClick ? "cursor-pointer" : ""}`}
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={onClick}
    >
      {/* Gradient background overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />

      {/* Header: label + icon */}
      <div className="relative z-10 flex items-center justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{ color }}
        >
          {label}
        </span>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
      </div>

      {/* Value */}
      <span className="relative z-10 font-heading text-xl font-bold tracking-tight text-foreground mt-0.5">
        {value}
      </span>

      {/* Trend + subtitle */}
      <div className="relative z-10 flex items-center gap-2 mt-0.5">
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              trend.dir === "up"
                ? "bg-[var(--shell-success)]/10 text-[var(--shell-success)] border border-[var(--shell-success)]/20"
                : "bg-[var(--shell-danger)]/10 text-[var(--shell-danger)] border border-[var(--shell-danger)]/20"
            }`}
          >
            {trend.dir === "up" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {trend.pct}
          </span>
        )}
        {subtitle && (
          <span className="text-[11px] text-muted-foreground font-medium">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
