"use client";

import { useCssOverrides } from "../../hooks/use-css-overrides";

/**
 * Injects saved CSS variable overrides into <head> on mount.
 * Place this component in root layouts BEFORE <body> content
 * to prevent flash of default theme.
 */
export function CssOverrides() {
  useCssOverrides();
  return null;
}
