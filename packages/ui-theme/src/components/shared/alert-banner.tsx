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
      "border-[var(--shell-accent)]/20 bg-gradient-to-r from-[var(--shell-accent)]/5 to-transparent",
    iconBg: "bg-[var(--shell-accent)]/10",
    iconColor: "text-[var(--shell-accent)]",
    textColor: "text-[var(--shell-accent-text)]",
  },
  danger: {
    wrapper:
      "border-[var(--shell-danger)]/20 bg-gradient-to-r from-[var(--shell-danger)]/5 to-transparent",
    iconBg: "bg-[var(--shell-danger)]/10",
    iconColor: "text-[var(--shell-danger)]",
    textColor: "text-[var(--shell-danger)]",
  },
  warning: {
    wrapper:
      "border-[var(--shell-warning)]/20 bg-gradient-to-r from-[var(--shell-warning)]/5 to-transparent",
    iconBg: "bg-[var(--shell-warning)]/10",
    iconColor: "text-[var(--shell-warning)]",
    textColor: "text-[var(--shell-warning)]",
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
