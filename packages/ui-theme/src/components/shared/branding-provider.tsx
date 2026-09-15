"use client";

import * as React from "react";
import { api } from "@datavex/auth-middleware";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface BrandColors {
  primary?: string;
  accent?: string;
  surface?: string;
  foreground?: string;
  muted?: string;
  [key: string]: string | undefined;
}

export interface BrandingData {
  logo_file_id?: number | null;
  favicon_file_id?: number | null;
  brand_colors?: BrandColors;
  company_name?: string;
  email_templates?: {
    sender_name?: string;
    sender_email?: string;
    footer?: string;
    email_logo_file_id?: number | null;
  };
}

export interface BrandingContextValue {
  branding: BrandingData;
  logoUrl: string | null;
  faviconUrl: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/* ── Defaults ───────────────────────────────────────────────────────────── */

const DEFAULT_BRANDING: BrandingData = {
  logo_file_id: null,
  favicon_file_id: null,
  brand_colors: {},
  company_name: "DATAVEX",
  email_templates: {},
};

/* ── Context ────────────────────────────────────────────────────────────── */

const BrandingContext = React.createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  logoUrl: null,
  faviconUrl: null,
  loading: true,
  refresh: async () => {},
});

/* ── File URL resolver ──────────────────────────────────────────────────── */

async function resolveFileUrl(fileId: number | null | undefined): Promise<string | null> {
  if (!fileId) return null;
  try {
    const data = await api.get<{ download_url: string }>(`/files/${fileId}/download`);
    return data.download_url;
  } catch {
    return null;
  }
}

/* ── CSS variable injection ─────────────────────────────────────────────── */

const COLOR_MAP: Record<string, string> = {
  primary: "--shell-brand",
  accent: "--shell-accent",
  surface: "--shell-surface",
  foreground: "--shell-foreground",
  muted: "--shell-muted",
};

function injectBrandColors(colors: BrandColors) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(COLOR_MAP)) {
    const value = colors[key];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }
}

function removeInjectedBrandColors() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const cssVar of Object.values(COLOR_MAP)) {
    root.style.removeProperty(cssVar);
  }
}

/* ── Favicon injection ──────────────────────────────────────────────────── */

let faviconLinkEl: HTMLLinkElement | null = null;

function setFavicon(url: string | null) {
  if (typeof document === "undefined") return;

  if (!url) {
    if (faviconLinkEl) {
      faviconLinkEl.remove();
      faviconLinkEl = null;
    }
    return;
  }

  if (!faviconLinkEl) {
    faviconLinkEl = document.createElement("link");
    faviconLinkEl.rel = "icon";
    faviconLinkEl.type = "image/x-icon";
    document.head.appendChild(faviconLinkEl);
  }
  faviconLinkEl.href = url;
}

/* ── Provider ───────────────────────────────────────────────────────────── */

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = React.useState<BrandingData>(DEFAULT_BRANDING);
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadBranding = React.useCallback(async () => {
    try {
      setLoading(true);
      const settings = await api.get<Record<string, any>>("/settings");
      const b: BrandingData = settings.branding || {};
      setBranding(b);

      // Resolve file URLs — favicon falls back to logo_file_id
      const effectiveFaviconId = b.favicon_file_id || b.logo_file_id;
      const [logo, favicon] = await Promise.all([
        resolveFileUrl(b.logo_file_id),
        resolveFileUrl(effectiveFaviconId),
      ]);
      setLogoUrl(logo);
      setFaviconUrl(favicon);

      // Inject colors
      if (b.brand_colors && Object.keys(b.brand_colors).length > 0) {
        injectBrandColors(b.brand_colors);
      }

      // Inject favicon
      setFavicon(favicon);
    } catch {
      // Not authenticated or settings not available — use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBranding();
    return () => removeInjectedBrandColors();
  }, [loadBranding]);

  const value = React.useMemo<BrandingContextValue>(
    () => ({ branding, logoUrl, faviconUrl, loading, refresh: loadBranding }),
    [branding, logoUrl, faviconUrl, loading, loadBranding],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

/* ── Hook ───────────────────────────────────────────────────────────────── */

export function useBranding(): BrandingContextValue {
  return React.useContext(BrandingContext);
}
