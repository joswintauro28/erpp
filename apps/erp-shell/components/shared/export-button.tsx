"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExport, type ExportColumn } from "@/hooks/useExport";
import { cn } from "@/lib/utils";

interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "xs";
  className?: string;
  disabled?: boolean;
}

/**
 * Reusable export button that generates and downloads a CSV file.
 *
 * @example
 * ```tsx
 * <ExportButton
 *   data={filtered}
 *   columns={[
 *     { header: "Name", accessor: "name" },
 *     { header: "Email", accessor: "email" },
 *   ]}
 *   filename="customers"
 * />
 * ```
 */
export function ExportButton<T>({
  data,
  columns,
  filename = "export",
  label = "Export",
  variant = "outline",
  size = "sm",
  className,
  disabled = false,
}: ExportButtonProps<T>) {
  const { exportCSV } = useExport();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => exportCSV(data, columns, filename)}
      disabled={disabled || data.length === 0}
      className={cn("gap-1.5 text-xs", className)}
    >
      <Download size={14} />
      {label}
    </Button>
  );
}
