"use client";

import { useEffect } from "react";
import { api } from "@datavex/auth-middleware";
import { applyOverrides } from "../lib/preview-injector";
import type { BrandingOverrides } from "../components/shared/branding-modal";

const CSS_OVERRIDES_CACHE_KEY = "datavex_css_overrides_cache";

function cacheOverrides(data: BrandingOverrides) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(CSS_OVERRIDES_CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function readCachedOverrides(): BrandingOverrides | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CSS_OVERRIDES_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

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
          cacheOverrides(overrides);
        }
      } catch {
        // Not authenticated — try cached overrides (e.g. login page)
        const cached = readCachedOverrides();
        if (!cancelled && cached && typeof cached === "object") {
          applyOverrides(cached);
        }
      }
    }

    loadAndApply();

    const handleTokenChange = () => {
      loadAndApply();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("datavex:token-changed", handleTokenChange);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("datavex:token-changed", handleTokenChange);
      }
    };
  }, []);
}
