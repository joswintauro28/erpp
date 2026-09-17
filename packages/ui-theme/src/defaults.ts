/**
 * DATAVEX Default Theme Preset
 *
 * Hardcoded from globals.css — reliable in Docker/SSR builds.
 * Used by the branding modal's "Reset to Default" and as the
 * fallback when no overrides are saved in the backend.
 */

import { extractDefaults } from "./lib/css-parser";
import { HARDCODED_PARSED_CSS } from "./lib/css-defaults";
import type { BrandingOverrides } from "./components/shared/branding-modal";

/**
 * The default DATAVEX theme — all CSS variable values as defined in globals.css.
 * This is the canonical source of truth for "Reset to Default".
 */
export const DATAVEX_DEFAULTS: BrandingOverrides = extractDefaults(HARDCODED_PARSED_CSS);

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
