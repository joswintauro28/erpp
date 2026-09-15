"use client";

// Re-export the theme-aware StatusBadge from shared ui-theme package.
// All status badges now use CSS variables for branding colors.
export { StatusBadge, STATUS_MAPS } from "@datavex/ui-theme";
export type { StatusBadgeProps } from "@datavex/ui-theme";
