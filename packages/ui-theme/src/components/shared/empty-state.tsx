import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
      <Icon className="h-12 w-12" />
      <p className="text-base font-medium text-[var(--shell-foreground)]">{title}</p>
      {description && <p className="text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
