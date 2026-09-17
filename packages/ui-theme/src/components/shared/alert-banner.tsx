import React from "react";
import { LucideIcon } from "lucide-react";

interface AlertBannerProps {
  icon: LucideIcon;
  message: string;
  badges?: React.ReactNode;
  variant?: "accent" | "danger" | "warning";
}

const variantStyles = {
  accent: {
    wrapper:
      "border-border bg-card/80 shadow-xs backdrop-blur-xs",
    iconBg: "bg-amber-500/15 border border-amber-500/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    textColor: "text-foreground font-medium",
  },
  danger: {
    wrapper:
      "border-[var(--shell-danger)]/30 bg-[var(--shell-danger-surface)]/60 shadow-xs backdrop-blur-xs",
    iconBg: "bg-[var(--shell-danger)]/15 border border-[var(--shell-danger)]/30",
    iconColor: "text-[var(--shell-danger)]",
    textColor: "text-foreground font-medium",
  },
  warning: {
    wrapper:
      "border-amber-500/30 bg-amber-500/5 shadow-xs backdrop-blur-xs",
    iconBg: "bg-amber-500/15 border border-amber-500/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    textColor: "text-foreground font-medium",
  },
};

export function AlertBanner({
  icon: Icon,
  message,
  badges,
  variant = "accent",
}: AlertBannerProps) {
  const v = variantStyles[variant];
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border px-5 py-3.5 ${v.wrapper}`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full ${v.iconBg}`}
      >
        <Icon className={`h-4 w-4 ${v.iconColor}`} />
      </div>
      <span className={`text-sm font-medium ${v.textColor}`}>{message}</span>
      {badges && <div className="flex flex-wrap gap-2">{badges}</div>}
    </div>
  );
}
