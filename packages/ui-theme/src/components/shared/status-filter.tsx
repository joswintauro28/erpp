"use client";

import { cn } from "../../lib/utils";

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label?: string;
  className?: string;
}

/**
 * Shared status filter dropdown.
 * Standardizes filter UX across all list/table pages.
 */
export function StatusFilter({
  value,
  onChange,
  options,
  label = "All Statuses",
  className,
}: StatusFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 rounded-md border border-border bg-card px-3 text-xs text-foreground",
        "focus:outline-none focus:ring-2 focus:ring-[var(--shell-brand)] focus:ring-offset-2",
        className
      )}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}
