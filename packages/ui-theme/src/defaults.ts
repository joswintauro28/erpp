/**
 * DATAVEX Default Theme Preset
 *
 * Extracted from globals.css via the CSS parser.
 * Used by the branding modal's "Reset to Default" and as the
 * fallback when no overrides are saved in the backend.
 */

// @ts-expect-error — ?raw import supported by Next.js / Turbopack
import globalsCssText from "./globals.css?raw";
import { parseGlobalsCss, extractDefaults } from "./lib/css-parser";
import type { BrandingOverrides } from "./components/shared/branding-modal";

const EMPTY_DEFAULTS: BrandingOverrides = { light: {}, dark: {} };

function computeDefaults(): BrandingOverrides {
  if (typeof globalsCssText !== "string") return EMPTY_DEFAULTS;
  try {
    const parsed = parseGlobalsCss(globalsCssText);
    return extractDefaults(parsed);
  } catch {
    return EMPTY_DEFAULTS;
  }
}

/**
 * The default DATAVEX theme — all CSS variable values as defined in globals.css.
 * This is the canonical source of truth for "Reset to Default".
 */
export const DATAVEX_DEFAULTS: BrandingOverrides = computeDefaults();

/**
 * Check whether a given set of overrides matches the defaults (i.e. no changes).
 */
export function isDefaultTheme(overrides: BrandingOverrides | null): boolean {
  if (!overrides) return true;
  for (const [key, value] of Object.entries(DATAVEX_DEFAULTS.light)) {
    if (overrides.light[key] !== value) return false;
  }
  for (const [key, value] of Object.entries(DATAVEX_DEFAULTS.dark)) {
    if (overrides.dark[key] !== value) return false;
  }
  return true;
}
