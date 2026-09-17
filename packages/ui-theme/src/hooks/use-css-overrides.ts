"use client";

import { useEffect } from "react";
import { api } from "@datavex/auth-middleware";
import { applyOverrides } from "../lib/preview-injector";
import type { BrandingOverrides } from "../components/shared/branding-modal";

/**
 * Fetches saved CSS variable overrides from the backend and injects them
 * as a <style> tag in <head> before any components render.
 *
 * Must be used inside a client component that has access to the JWT token.
 */
export function useCssOverrides() {
  useEffect(() => {
    let cancelled = false;

    async function loadAndApply() {
      try {
        const settings = await api.get<Record<string, any>>("/settings");
        const overrides: BrandingOverrides | null | undefined =
          settings?.branding?.css_overrides;

        if (!cancelled && overrides && typeof overrides === "object") {
          applyOverrides(overrides);
        }
      } catch {
        // Not authenticated or settings unavailable — use CSS defaults
      }
    }

    loadAndApply();

    return () => {
      cancelled = true;
    };
  }, []);
}
