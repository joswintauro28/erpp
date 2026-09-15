/**
 * Shared color maps — used across CRM, Billing, and ERP shell dashboards.
 * Eliminates the duplicated definitions previously in each app.
 */

export const stageColors: Record<string, { bg: string; color: string }> = {
  Discovery:   { bg: "var(--shell-info-surface)", color: "var(--shell-info)" },
  Proposal:    { bg: "var(--shell-warning-surface)", color: "var(--shell-warning)" },
  Negotiation: { bg: "var(--shell-accent-surface)", color: "var(--shell-accent-text)" },
  Won:         { bg: "var(--shell-success-surface)", color: "var(--shell-success)" },
  Lost:        { bg: "var(--shell-danger-surface)", color: "var(--shell-danger)" },
};

export function statusColor(status: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    Paid:      { bg: "bg-[var(--shell-success)]/10 dark:bg-[var(--shell-success)]/20", text: "text-[var(--shell-success)]" },
    Pending:   { bg: "bg-[var(--shell-warning)]/10 dark:bg-[var(--shell-warning)]/20", text: "text-[var(--shell-warning)]" },
    Overdue:   { bg: "bg-[var(--shell-danger)]/10 dark:bg-[var(--shell-danger)]/20", text: "text-[var(--shell-danger)]" },
    Draft:     { bg: "bg-muted", text: "text-muted-foreground" },
    Sent:      { bg: "bg-[var(--shell-info)]/10 dark:bg-[var(--shell-info)]/20", text: "text-[var(--shell-info)]" },
    Cancelled: { bg: "bg-muted", text: "text-muted-foreground" },
    Refunded:  { bg: "bg-[var(--shell-warning)]/10 dark:bg-[var(--shell-warning)]/20", text: "text-[var(--shell-warning)]" },
    Failed:    { bg: "bg-[var(--shell-danger)]/10 dark:bg-[var(--shell-danger)]/20", text: "text-[var(--shell-danger)]" },
  };
  return map[status] || { bg: "bg-muted", text: "text-muted-foreground" };
}

export const levelColors: Record<string, { bg: string; color: string }> = {
  Critical: { bg: "var(--shell-danger-surface)", color: "var(--shell-danger)" },
  High:     { bg: "var(--shell-warning-surface)", color: "var(--shell-warning)" },
  Medium:   { bg: "var(--shell-accent-surface)", color: "var(--shell-accent-text)" },
  Low:      { bg: "var(--shell-info-surface)", color: "var(--shell-info)" },
};

export const frequencyColors: Record<string, { bg: string; color: string }> = {
  Weekly:    { bg: "var(--shell-info-surface)", color: "var(--shell-info)" },
  Monthly:   { bg: "var(--shell-success-surface)", color: "var(--shell-success)" },
  Quarterly: { bg: "var(--shell-warning-surface)", color: "var(--shell-warning)" },
  Yearly:    { bg: "var(--shell-accent-surface)", color: "var(--shell-accent-text)" },
};
