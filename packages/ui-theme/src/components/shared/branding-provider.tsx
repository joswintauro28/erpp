"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { api } from "@datavex/auth-middleware";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface ThemeColorSet {
  primary: string;
  accent: string;
  surface: string;
  foreground: string;
  muted: string;
  background: string;
  border: string;
}

export interface BrandingData {
  logo_file_id?: number | null;
  favicon_file_id?: number | null;
  brand_colors?: {
    light?: Partial<ThemeColorSet>;
    dark?: Partial<ThemeColorSet>;
  };
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

/* ── Defaults (synced with packages/ui-theme/src/globals.css) ────────── */

export const DEFAULT_LIGHT_COLORS: ThemeColorSet = {
  primary: "#f2470c",
  accent: "#fff0eb",
  surface: "#ffffff",
  foreground: "#09090b",
  muted: "#52525b",
  background: "#f4f5f8",
  border: "#e2e8f0",
};

export const DEFAULT_DARK_COLORS: ThemeColorSet = {
  primary: "#f2470c",
  accent: "#741e02",
  surface: "#121212",
  foreground: "#f0f0f0",
  muted: "#969696",
  background: "#0a0a0a",
  border: "#1f1f1f",
};

const DEFAULT_BRANDING: BrandingData = {
  logo_file_id: null,
  favicon_file_id: null,
  brand_colors: {
    light: DEFAULT_LIGHT_COLORS,
    dark: DEFAULT_DARK_COLORS,
  },
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

// Maps our color keys to the CSS custom properties that Tailwind reads from.
// These are the BASE tokens — setting these changes the entire theme.
const BASE_TOKEN_MAP: Record<string, string> = {
  primary:    "--primary",
  accent:     "--accent",
  surface:    "--card",
  foreground: "--foreground",
  muted:      "--muted-foreground",
  background: "--background",
  border:     "--border",
};

// Sidebar-specific tokens that should track the brand primary/accent.
const SIDEBAR_TOKEN_MAP: Record<string, string> = {
  primary: "--sidebar-primary",
  accent:  "--sidebar-accent",
  surface: "--sidebar",
};

// Ring token tracks primary.
const RING_TOKEN = "--ring";

function injectThemeColors(colors: Partial<ThemeColorSet>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Inject base design tokens
  for (const [key, cssVar] of Object.entries(BASE_TOKEN_MAP)) {
    const value = colors[key as keyof ThemeColorSet];
    if (value) root.style.setProperty(cssVar, value);
  }

  // Inject sidebar tokens from primary/accent/surface
  for (const [key, cssVar] of Object.entries(SIDEBAR_TOKEN_MAP)) {
    const value = colors[key as keyof ThemeColorSet];
    if (value) root.style.setProperty(cssVar, value);
  }

  // Ring tracks primary
  if (colors.primary) root.style.setProperty(RING_TOKEN, colors.primary);
}

function clearInjectedColors() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const allVars = [
    ...Object.values(BASE_TOKEN_MAP),
    ...Object.values(SIDEBAR_TOKEN_MAP),
    RING_TOKEN,
  ];
  for (const cssVar of allVars) {
    root.style.removeProperty(cssVar);
  }
}

/* ── Favicon injection ──────────────────────────────────────────────────── */

let faviconLinkEl: HTMLLinkElement | null = null;

function setFavicon(url: string | null) {
  if (typeof document === "undefined") return;

  // Remove ALL existing favicon links (including Next.js default)
  const existing = document.querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']");
  existing.forEach((el) => el.remove());
  faviconLinkEl = null;

  if (!url) return;

  // Detect MIME type from URL extension, default to png
  const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    ico: "image/x-icon",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
  };

  faviconLinkEl = document.createElement("link");
  faviconLinkEl.rel = "icon";
  faviconLinkEl.type = mimeMap[ext] ?? "image/png";
  faviconLinkEl.href = url;
  document.head.appendChild(faviconLinkEl);
}

/* ── Cache (for login page / unauthenticated views) ────────────────────── */

const BRANDING_CACHE_KEY = "datavex_branding_cache";

function cacheBranding(data: BrandingData, logo: string | null, favicon: string | null) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify({ branding: data, logoUrl: logo, faviconUrl: favicon }));
  } catch { /* ignore */ }
}

function readCachedBranding(): { branding: BrandingData; logoUrl: string | null; faviconUrl: string | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

/* ── Provider ───────────────────────────────────────────────────────────── */

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = React.useState<BrandingData>(DEFAULT_BRANDING);
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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

      // Inject favicon
      setFavicon(favicon);

      // Cache for unauthenticated views (login page)
      cacheBranding(b, logo, favicon);
    } catch {
      // Not authenticated — try cached branding (e.g. login page)
      const cached = readCachedBranding();
      if (cached) {
        setBranding(cached.branding);
        setLogoUrl(cached.logoUrl);
        setFaviconUrl(cached.faviconUrl);
        setFavicon(cached.faviconUrl);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply theme colors when branding or theme changes
  React.useEffect(() => {
    if (loading) return;
    const colorSets = branding.brand_colors;
    if (!colorSets) return;

    const activeSet = isDark ? colorSets.dark : colorSets.light;
    if (activeSet && Object.keys(activeSet).length > 0) {
      injectThemeColors(activeSet);
    }
  }, [branding, isDark, loading]);

  React.useEffect(() => {
    loadBranding();
    return () => {
      clearInjectedColors();
      setFavicon(null);
    };
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
