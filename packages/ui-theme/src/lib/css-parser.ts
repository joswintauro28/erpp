/**
 * CSS Variable Parser — parses globals.css into structured CssVariable[].
 *
 * Extracts --* declarations from :root {} and .dark {} blocks,
 * detects value types, and preserves line order for the modal.
 */

export type VariableType = "color" | "size" | "font" | "calc" | "reference" | "other";

export interface CssVariable {
  /** Variable name without leading -- (e.g. "primary", "shell-border") */
  name: string;
  /** Full CSS property name (e.g. "--primary") */
  cssVar: string;
  /** Current value (e.g. "#f2470c", "var(--background)") */
  value: string;
  /** Detected type for UI rendering */
  type: VariableType;
  /** Line number in original CSS (1-indexed) */
  line: number;
  /** Whether this is a comment block */
  comment?: string;
}

export interface ParsedCss {
  light: CssVariable[];
  dark: CssVariable[];
}

// ── Type Detection ──────────────────────────────────────────────────────────

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const FUNC_COLOR_RE = /^(rgb|rgba|hsla?|oklch|color-mix)\s*\(/;
const SIZE_RE = /^-?\d+(\.\d+)?(px|rem|em|pt|vh|vw|vmin|vmax|ch|ex|cm|mm|in)$/i;
const FONT_RE = /^["']?.+["']?,\s*(sans-serif|serif|monospace|cursive|fantasy)$/i;
const CALc_RE = /^calc\s*\(/;
const VAR_RE = /^var\s*\(/;

function detectType(value: string): VariableType {
  const v = value.trim();
  if (HEX_RE.test(v)) return "color";
  if (FUNC_COLOR_RE.test(v)) return "color";
  if (CALc_RE.test(v)) return "calc";
  if (VAR_RE.test(v)) return "reference";
  if (SIZE_RE.test(v)) return "size";
  if (FONT_RE.test(v)) return "font";
  return "other";
}

// ── CSS Parser ──────────────────────────────────────────────────────────────

export function parseGlobalsCss(cssText: string): ParsedCss {
  const light: CssVariable[] = [];
  const dark: CssVariable[] = [];

  const lines = cssText.split("\n");
  let currentBlock: "root" | "dark" | null = null;
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Detect block start: :root { or .dark {
    if (/^:root\s*\{/.test(trimmed)) {
      currentBlock = "root";
      depth = 1;
      continue;
    }
    if (/^\.dark\s*\{/.test(trimmed)) {
      currentBlock = "dark";
      depth = 1;
      continue;
    }

    // Track nesting depth
    if (currentBlock) {
      for (const ch of trimmed) {
        if (ch === "{") depth++;
        if (ch === "}") depth--;
      }

      // Block ended
      if (depth <= 0) {
        currentBlock = null;
        continue;
      }

      // Skip comments (but capture them)
      if (trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("//")) {
        continue;
      }

      // Parse variable declaration: --name: value;
      const varMatch = trimmed.match(/^--([\w-]+)\s*:\s*(.+?);?\s*$/);
      if (varMatch) {
        const [, name, rawValue] = varMatch;
        const value = rawValue.replace(/;$/, "").trim();

        const variable: CssVariable = {
          name,
          cssVar: `--${name}`,
          value,
          type: detectType(value),
          line: lineNum,
        };

        if (currentBlock === "root") {
          light.push(variable);
        } else {
          dark.push(variable);
        }
      }
    }
  }

  return { light, dark };
}

// ── Defaults extraction ─────────────────────────────────────────────────────

/**
 * Extract default values from globals.css as a plain record.
 * Useful for "Reset to Default" functionality.
 */
export function extractDefaults(parsed: ParsedCss): {
  light: Record<string, string>;
  dark: Record<string, string>;
} {
  return {
    light: Object.fromEntries(parsed.light.map((v) => [v.cssVar, v.value])),
    dark: Object.fromEntries(parsed.dark.map((v) => [v.cssVar, v.value])),
  };
}

/**
 * Check if a variable value is the default (hasn't been overridden).
 */
export function isDefault(
  cssVar: string,
  currentValue: string,
  defaults: { light: Record<string, string>; dark: Record<string, string> },
  isDark: boolean,
): boolean {
  const block = isDark ? defaults.dark : defaults.light;
  return block[cssVar] === currentValue;
}
