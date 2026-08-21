import React from "react";

interface SectionHeadingProps {
  label: string;
  action?: React.ReactNode;
}

export function SectionHeading({ label, action }: SectionHeadingProps) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 flex-1">
        <h2 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-[var(--shell-muted)]">
          {label}
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--shell-border)] via-[var(--shell-border)]/50 to-transparent" />
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
