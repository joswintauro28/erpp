"use client";

import { useCallback } from "react";

interface Column<T> {
  /** Header label */
  header: string;
  /** Accessor key or function to extract value */
  accessor: keyof T | ((item: T) => string | number | boolean | null | undefined);
  /** Optional format function */
  format?: (value: unknown) => string;
}

interface UseExportOptions {
  /** Default filename without .csv extension */
  defaultFilename?: string;
}

interface UseExportReturn {
  exportCSV: <T>(items: T[], columns: Column<T>[], filename?: string) => void;
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * CSV export hook that generates downloadable CSV files.
 *
 * @example
 * ```tsx
 * const { exportCSV } = useExport();
 *
 * const columns = [
 *   { header: "Name", accessor: "name" },
 *   { header: "Email", accessor: "email" },
 *   { header: "Revenue", accessor: "revenue", format: (v) => `₹${v}` },
 * ];
 *
 * <Button onClick={() => exportCSV(leads, columns, "leads-export")}>
 *   Export CSV
 * </Button>
 * ```
 */
export function useExport(options: UseExportOptions = {}): UseExportReturn {
  const { defaultFilename = "export" } = options;

  const exportCSV = useCallback(
    <T,>(items: T[], columns: Column<T>[], filename?: string) => {
      const name = filename || defaultFilename;
      const date = new Date().toISOString().slice(0, 10);
      const fullFilename = `${name}-${date}.csv`;

      const headerRow = columns.map((col) => escapeCSV(col.header)).join(",");
      const dataRows = items.map((item) => {
        return columns
          .map((col) => {
            const raw =
              typeof col.accessor === "function"
                ? col.accessor(item)
                : (item as Record<string, unknown>)[col.accessor as string];
            const value = col.format ? col.format(raw) : raw;
            return escapeCSV(value);
          })
          .join(",");
      });

      const csv = [headerRow, ...dataRows].join("\n");
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fullFilename;
      link.click();
      URL.revokeObjectURL(url);
    },
    [defaultFilename]
  );

  return { exportCSV };
}

export type { Column as ExportColumn };
