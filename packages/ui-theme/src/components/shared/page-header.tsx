import React from "react";
import { Badge } from "../ui/badge";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--shell-border)] pb-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--shell-foreground)]">
            {title}
          </h1>
          {badge && (
            <Badge
              variant="outline"
              className="px-2.5 py-0.5 text-xs font-semibold border-[var(--shell-brand)]/40 text-[var(--shell-brand)] bg-[var(--shell-brand)]/10"
            >
              {badge}
            </Badge>
          )}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[var(--shell-muted)] max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
