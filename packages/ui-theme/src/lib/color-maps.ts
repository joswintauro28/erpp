/**
 * Shared color maps — used across CRM, Billing, and ERP shell dashboards.
 * Eliminates the duplicated definitions previously in each app.
 */

export const stageColors: Record<string, { bg: string; color: string }> = {
  Discovery:   { bg: "#dbeafe", color: "#1d4ed8" },
  Proposal:    { bg: "#fef3c7", color: "#b45309" },
  Negotiation: { bg: "#ede9fe", color: "#7c3aed" },
  Won:         { bg: "#dcfce7", color: "#15803d" },
  Lost:        { bg: "#fee2e2", color: "#b91c1c" },
};

export function statusColor(status: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    Paid:      { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400" },
    Pending:   { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400" },
    Overdue:   { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400" },
    Draft:     { bg: "bg-slate-50 dark:bg-slate-950/30", text: "text-slate-700 dark:text-slate-400" },
    Sent:      { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400" },
    Cancelled: { bg: "bg-gray-50 dark:bg-gray-950/30", text: "text-gray-700 dark:text-gray-400" },
    Refunded:  { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400" },
    Failed:    { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400" },
  };
  return map[status] || { bg: "bg-slate-50 dark:bg-slate-950/30", text: "text-slate-700 dark:text-slate-400" };
}

export const levelColors: Record<string, { bg: string; color: string }> = {
  Critical: { bg: "#fee2e2", color: "#b91c1c" },
  High:     { bg: "#ffedd5", color: "#c2410c" },
  Medium:   { bg: "#fef3c7", color: "#b45309" },
  Low:      { bg: "#dbeafe", color: "#1d4ed8" },
};

export const frequencyColors: Record<string, { bg: string; color: string }> = {
  Weekly:  { bg: "#dbeafe", color: "#1d4ed8" },
  Monthly: { bg: "#dcfce7", color: "#15803d" },
  Quarterly: { bg: "#fef3c7", color: "#b45309" },
  Yearly:  { bg: "#ede9fe", color: "#7c3aed" },
};
