/**
 * CSS Variable Category Classifier — groups CssVariables by semantic category.
 *
 * Each category has a name, icon hint, and regex-based matching rules.
 * Variables are matched in order; first match wins.
 */

import type { CssVariable } from "./css-parser";

export interface CategoryRule {
  /** Display name */
  name: string;
  /** Lucide icon name hint for the modal */
  icon: string;
  /** Regex patterns to match against variable name (without --) */
  patterns: RegExp[];
}

export interface VariableCategory {
  name: string;
  icon: string;
  variables: CssVariable[];
}

// ── Category Definitions ────────────────────────────────────────────────────

const CATEGORY_RULES: CategoryRule[] = [
  {
    name: "Brand Colors",
    icon: "Palette",
    patterns: [
      /^primary/,
      /^accent/,
      /^ring$/,
      /^shell-brand$/,
      /^shell-accent/,
      /^action$/,
    ],
  },
  {
    name: "Surface & Background",
    icon: "Layers",
    patterns: [
      /^background$/,
      /^card/,
      /^popover/,
      /^secondary$/,
      /^secondary-foreground$/,
      /^muted$/,
      /^shell-bg$/,
      /^shell-surface/,
      /^shell-card$/,
      /^shell-popover$/,
      /^shell-header$/,
      /^sidebar$/,
      /^sidebar-foreground$/,
    ],
  },
  {
    name: "Text & Foreground",
    icon: "Type",
    patterns: [
      /^foreground$/,
      /-foreground$/,
      /^muted-foreground$/,
      /^shell-foreground$/,
      /^shell-muted$/,
      /^shell-accent-text$/,
      /^shell-accent-surface$/,
    ],
  },
  {
    name: "Charts",
    icon: "BarChart3",
    patterns: [/^chart-/],
  },
  {
    name: "Sidebar Navigation",
    icon: "PanelLeft",
    patterns: [
      /^sidebar-primary/,
      /^sidebar-accent/,
      /^sidebar-border/,
      /^sidebar-ring/,
      /^sidebar-bg$/,
      /^sidebar-fg$/,
      /^sidebar-active/,
      /^sidebar-hover/,
      /^sidebar-edge$/,
    ],
  },
  {
    name: "Status (Semantic)",
    icon: "CircleDot",
    patterns: [
      /^destructive/,
      /^shell-success/,
      /^shell-warning/,
      /^shell-danger/,
      /^shell-info/,
    ],
  },
  {
    name: "Shadows",
    icon: "Shadow",
    patterns: [/^shadow/],
  },
  {
    name: "Fonts",
    icon: "AArrowUp",
    patterns: [/^font-/],
  },
  {
    name: "Layout & Spacing",
    icon: "Move",
    patterns: [
      /^header-height/,
      /^sidebar-width/,
      /^radius/,
      /^spacing$/,
      /^tracking/,
    ],
  },
];

// ── Classifier ──────────────────────────────────────────────────────────────

function matchesAny(name: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(name));
}

/**
 * Classify a flat list of CssVariables into grouped categories.
 * Variables that don't match any rule go into "Other".
 */
export function classifyVariables(variables: CssVariable[]): VariableCategory[] {
  const buckets = new Map<string, CssVariable[]>();

  // Initialize all categories (preserves ordering)
  for (const rule of CATEGORY_RULES) {
    buckets.set(rule.name, []);
  }
  buckets.set("Other", []);

  // Classify each variable
  for (const v of variables) {
    let matched = false;
    for (const rule of CATEGORY_RULES) {
      if (matchesAny(v.name, rule.patterns)) {
        buckets.get(rule.name)!.push(v);
        matched = true;
        break;
      }
    }
    if (!matched) {
      buckets.get("Other")!.push(v);
    }
  }

  // Build result, dropping empty categories
  const result: VariableCategory[] = [];
  for (const rule of CATEGORY_RULES) {
    const vars = buckets.get(rule.name)!;
    if (vars.length > 0) {
      result.push({ name: rule.name, icon: rule.icon, variables: vars });
    }
  }

  // "Other" at the end if non-empty
  const otherVars = buckets.get("Other")!;
  if (otherVars.length > 0) {
    result.push({ name: "Other", icon: "MoreHorizontal", variables: otherVars });
  }

  return result;
}
