"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { useTheme } from "next-themes";
import { HexColorPicker } from "@datavex/ui-theme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sun, Moon, Save, Sparkles, Upload, X, Loader2, CheckCircle2, RotateCcw, Paintbrush } from "lucide-react";
import { api } from "@datavex/auth-middleware";
import { useBranding, cn, DEFAULT_LIGHT_COLORS, DEFAULT_DARK_COLORS, BrandingModal, applyOverrides } from "@datavex/ui-theme";
import type { ThemeColorSet, BrandingOverrides } from "@datavex/ui-theme";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface BrandColors {
  light: ThemeColorSet;
  dark: ThemeColorSet;
}

interface EmailTemplates {
  sender_name: string;
  sender_email: string;
  footer: string;
  email_logo_file_id: number | null;
}

interface BrandingState {
  logo_file_id: number | null;
  favicon_file_id: number | null;
  brand_colors: BrandColors;
  email_templates: EmailTemplates;
}

/* ── Defaults ───────────────────────────────────────────────────────────── */

const DEFAULT_LIGHT: ThemeColorSet = DEFAULT_LIGHT_COLORS;
const DEFAULT_DARK: ThemeColorSet = DEFAULT_DARK_COLORS;

const COLOR_META: Record<string, { label: string; cssVar: string }> = {
  primary:    { label: "Primary",    cssVar: "--primary" },
  accent:     { label: "Accent",     cssVar: "--accent" },
  surface:    { label: "Surface",    cssVar: "--card" },
  foreground: { label: "Foreground", cssVar: "--foreground" },
  muted:      { label: "Muted",      cssVar: "--muted-foreground" },
  background: { label: "Background", cssVar: "--background" },
  border:     { label: "Border",     cssVar: "--border" },
};

const CSS_VAR_MAP: Record<string, string> = {
  primary:    "--primary",
  accent:     "--accent",
  surface:    "--card",
  foreground: "--foreground",
  muted:      "--muted-foreground",
  background: "--background",
  border:     "--border",
};

/* ── Helpers ────────────────────────────────────────────────────────────── */

async function resolveFileUrl(fileId: number | null | undefined): Promise<string | null> {
  if (!fileId) return null;
  try {
    const data = await api.get<{ download_url: string }>(`/files/${fileId}/download`);
    return data.download_url;
  } catch {
    return null;
  }
}

async function uploadFile(
  file: File,
  bucket: string,
  ownerType: string,
  ownerId: number,
) {
  const { file_id, upload_url } = await api.post<{
    file_id: number;
    upload_url: string;
  }>("/files/upload-request", {
    original_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    bucket,
    owner_type: ownerType,
    owner_id: ownerId,
    client_name: null,
  });

  const putRes = await fetch(upload_url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => "");
    throw new Error(`RustFS upload failed (${putRes.status}): ${text}`);
  }

  return api.post<{ id: number }>("/files/confirm-upload", { file_id });
}

const COLOR_PRESETS = [
  "#f2470c", // Primary Orange-Red
  "#8c1d24", // Deep Brand / Crimson
  "#e5b83c", // Accent Gold
  "#10b981", // Success Emerald
  "#d97706", // Warning Amber
  "#ef4444", // Danger Red
  "#2563eb", // Info Blue
  "#6366f1", // Indigo
  "#09090b", // Deep Dark
  "#18181b", // Zinc 900
  "#52525b", // Muted Slate
  "#e2e8f0", // Border Slate
  "#ffffff", // White
  "#fff0eb", // Peachy Accent Surface
];

/* ── Color Picker Popover (portal-based to escape overflow-hidden) ───────── */

function ColorPickerPopover({
  color,
  onChange,
  label,
}: {
  color: string;
  onChange: (c: string) => void;
  label: string;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  const updatePosition = React.useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const panelWidth = 240;
      const panelHeight = 280;

      let left = rect.left;
      if (left + panelWidth > window.innerWidth - 10) {
        left = window.innerWidth - panelWidth - 10;
      }
      if (left < 10) left = 10;

      let top = rect.bottom + 8;
      if (top + panelHeight > window.innerHeight - 10) {
        top = Math.max(10, rect.top - panelHeight - 8);
      }

      setPosition({ top, left });
    }
  }, []);

  React.useEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleScroll = () => { if (open) updatePosition(); };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="relative h-8 w-8 shrink-0 rounded-lg border-2 border-border shadow-xs cursor-pointer transition-transform hover:scale-110 active:scale-95 overflow-hidden ring-1 ring-inset ring-black/10 dark:ring-white/20"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
          backgroundSize: "8px 8px",
          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
        }}
        title={`Pick ${label} color (current: ${color})`}
      >
        <span
          className="absolute inset-0 block rounded-[6px]"
          style={{ backgroundColor: color }}
        />
      </button>
      {open &&
        ReactDOM.createPortal(
          <div
            ref={panelRef}
            className="fixed z-[9999] w-[240px] p-3 rounded-xl border border-border bg-card text-card-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none"
            style={{ top: position.top, left: position.left }}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
              <span className="text-xs font-semibold text-foreground">{label} Color</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <HexColorPicker color={color} onChange={onChange} className="!w-full !h-[140px]" />
            </div>

            {/* Quick Presets */}
            <div className="mt-2.5">
              <span className="text-[10px] font-medium text-muted-foreground block mb-1">
                Presets
              </span>
              <div className="grid grid-cols-7 gap-1">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onChange(preset)}
                    className="h-5 w-5 rounded-md border border-border/80 shadow-2xs hover:scale-115 transition-transform cursor-pointer ring-1 ring-inset ring-black/10 dark:ring-white/20"
                    style={{ backgroundColor: preset }}
                    title={preset}
                  />
                ))}
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-border/60">
              <Input
                value={color}
                onChange={(e) => {
                  let v = e.target.value.trim();
                  if (!v.startsWith("#")) v = "#" + v;
                  if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
                }}
                onBlur={(e) => {
                  let v = e.target.value.trim();
                  if (!v.startsWith("#")) v = "#" + v;
                  if (/^#[0-9A-Fa-f]{6}$/.test(v) && v !== color) onChange(v);
                }}
                className="h-7 font-mono text-xs"
                placeholder="#000000"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/* ── Theme Color Set Editor ─────────────────────────────────────────────── */

function ThemeColorEditor({
  colors,
  onChange,
  theme,
}: {
  colors: ThemeColorSet;
  onChange: (key: keyof ThemeColorSet, value: string) => void;
  theme: "light" | "dark";
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={rootRef} className="space-y-3">
      {Object.entries(COLOR_META).map(([key, meta]) => (
        <div
          key={key}
          className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0"
        >
          <div className="flex items-center gap-2.5">
            <ColorPickerPopover
              color={colors[key as keyof ThemeColorSet]}
              onChange={(v) => onChange(key as keyof ThemeColorSet, v)}
              label={meta.label}
            />
            <span className="text-sm font-medium text-foreground">
              {meta.label}
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {meta.cssVar}
            </span>
          </div>
          <Input
            className="w-24 font-mono text-xs h-8"
            value={colors[key as keyof ThemeColorSet]}
            onChange={(e) => {
              let v = e.target.value.trim();
              if (!v.startsWith("#")) v = "#" + v;
              if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                onChange(key as keyof ThemeColorSet, v);
              }
            }}
            onBlur={(e) => {
              let v = e.target.value.trim();
              if (!v.startsWith("#")) v = "#" + v;
              if (/^#[0-9A-Fa-f]{6}$/.test(v) && v !== colors[key as keyof ThemeColorSet]) {
                onChange(key as keyof ThemeColorSet, v);
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────── */

export default function Branding() {
  const { refresh } = useBranding();
  const { resolvedTheme } = useTheme();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = React.useState<"light" | "dark">(resolvedTheme === "dark" ? "dark" : "light");

  const [state, setState] = React.useState<BrandingState>({
    logo_file_id: null,
    favicon_file_id: null,
    brand_colors: {
      light: { ...DEFAULT_LIGHT },
      dark: { ...DEFAULT_DARK },
    },
    email_templates: {
      sender_name: "DATAVEX ERP",
      sender_email: "noreply@datavex.in",
      footer: "Powered by DATAVEX Technologies",
      email_logo_file_id: null,
    },
  });

  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [emailLogoPreview, setEmailLogoPreview] = React.useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [uploadingEmailLogo, setUploadingEmailLogo] = React.useState(false);

  // Theme Editor modal state
  const [themeEditorOpen, setThemeEditorOpen] = React.useState(false);
  const [cssOverrides, setCssOverrides] = React.useState<BrandingOverrides | null>(null);

  // Sync active tab with theme
  React.useEffect(() => {
    setActiveTab(resolvedTheme === "dark" ? "dark" : "light");
  }, [resolvedTheme]);

  /* ── LIVE brand color injection ──────────────────────────────────────── */
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const activeColors = state.brand_colors[activeTab];

    // Inject base design tokens
    for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
      const value = activeColors[key as keyof ThemeColorSet];
      if (value) root.style.setProperty(cssVar, value);
    }

    // Sidebar tokens
    if (activeColors.primary) {
      root.style.setProperty("--sidebar-primary", activeColors.primary);
      root.style.setProperty("--ring", activeColors.primary);
    }
    if (activeColors.accent) {
      root.style.setProperty("--sidebar-accent", activeColors.accent);
    }
    if (activeColors.surface) {
      root.style.setProperty("--sidebar", activeColors.surface);
    }
  }, [state.brand_colors, activeTab]);

  /* ── Load settings ──────────────────────────────────────────────────── */
  React.useEffect(() => {
    (async () => {
      try {
        const settings = await api.get<Record<string, any>>("/settings");
        const b = settings.branding || {};

        // Migrate old flat brand_colors to light/dark structure
        let colors: BrandColors;
        if (b.brand_colors?.light) {
          // Already in new format
          colors = {
            light: { ...DEFAULT_LIGHT, ...b.brand_colors.light },
            dark: { ...DEFAULT_DARK, ...b.brand_colors.dark },
          };
        } else if (b.brand_colors?.primary) {
          // Old flat format — migrate to light only
          colors = {
            light: { ...DEFAULT_LIGHT, ...b.brand_colors },
            dark: { ...DEFAULT_DARK },
          };
        } else {
          colors = { light: { ...DEFAULT_LIGHT }, dark: { ...DEFAULT_DARK } };
        }

        setState({
          logo_file_id: b.logo_file_id ?? null,
          favicon_file_id: b.favicon_file_id ?? null,
          brand_colors: colors,
          email_templates: {
            sender_name: b.email_templates?.sender_name || "DATAVEX ERP",
            sender_email: b.email_templates?.sender_email || "noreply@datavex.in",
            footer: b.email_templates?.footer || "Powered by DATAVEX Technologies",
            email_logo_file_id: b.email_templates?.email_logo_file_id ?? null,
          },
        });

        // Load and apply CSS overrides
        const overrides: BrandingOverrides | null = b.css_overrides ?? null;
        setCssOverrides(overrides);
        if (overrides) {
          applyOverrides(overrides);
        }

        const [logoUrl, emailLogoUrl] = await Promise.all([
          resolveFileUrl(b.logo_file_id),
          resolveFileUrl(b.email_templates?.email_logo_file_id),
        ]);
        if (logoUrl) setLogoPreview(logoUrl);
        if (emailLogoUrl) setEmailLogoPreview(emailLogoUrl);
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Logo upload ─────────────────────────────────────────────────────── */
  const handleUploadLogo = React.useCallback(async (file: File) => {
    setUploadingLogo(true);
    setMessage(null);
    try {
      const record = await uploadFile(file, "erp-backups", "branding_logo", 0);
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      setState((s) => ({
        ...s,
        logo_file_id: record.id,
        favicon_file_id: record.id,
      }));
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Logo upload failed" });
    } finally {
      setUploadingLogo(false);
    }
  }, []);

  const handleUploadEmailLogo = React.useCallback(async (file: File) => {
    setUploadingEmailLogo(true);
    setMessage(null);
    try {
      const record = await uploadFile(file, "erp-backups", "branding_email_logo", 0);
      const url = URL.createObjectURL(file);
      setEmailLogoPreview(url);
      setState((s) => ({
        ...s,
        email_templates: { ...s.email_templates, email_logo_file_id: record.id },
      }));
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Email logo upload failed" });
    } finally {
      setUploadingEmailLogo(false);
    }
  }, []);

  /* ── Color change handler ────────────────────────────────────────────── */
  const handleColorChange = React.useCallback((key: keyof ThemeColorSet, value: string) => {
    setState((s) => ({
      ...s,
      brand_colors: {
        ...s.brand_colors,
        [activeTab]: {
          ...s.brand_colors[activeTab],
          [key]: value,
        },
      },
    }));
  }, [activeTab]);

  /* ── Reset to defaults handler ────────────────────────────────────────── */
  const handleResetToDefaults = React.useCallback(() => {
    setState((s) => ({
      ...s,
      brand_colors: {
        light: { ...DEFAULT_LIGHT_COLORS },
        dark: { ...DEFAULT_DARK_COLORS },
      },
    }));
    setMessage({ type: "success", text: "Colors reset to defaults. Click 'Save Changes' to apply permanently." });
  }, []);

  /* ── Save handler ────────────────────────────────────────────────────── */
  const handleSave = React.useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/settings", { branding: state });
      setMessage({ type: "success", text: "Branding saved successfully" });
      await refresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  }, [state, refresh]);

  /* ── Theme Editor save handler ──────────────────────────────────────── */
  const handleThemeEditorSave = React.useCallback(async (overrides: BrandingOverrides) => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/settings", { branding: { css_overrides: overrides } });
      setCssOverrides(overrides);
      applyOverrides(overrides);
      setMessage({ type: "success", text: "Theme saved successfully" });
      await refresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save theme" });
    } finally {
      setSaving(false);
    }
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeColors = state.brand_colors[activeTab];

  return (
    <div className="relative space-y-6">
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-primary shimmer-glow" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Branding
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Customise your brand identity across all modules
          </p>
        </div>
        <div className="flex items-center gap-2">
          {message && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                message.type === "success"
                  ? "bg-[var(--shell-success-surface)] text-[var(--shell-success)]"
                  : "bg-[var(--shell-danger-surface)] text-[var(--shell-danger)]",
              )}
            >
              {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : null}
              {message.text}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Logo (unified — sidebar + favicon) ──────────────────────── */}
        <Card className="border-border hover:shadow-md transition-shadow duration-200">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Company Logo
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Used as sidebar logo and browser favicon across all modules
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Logo &amp; Favicon</Label>
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-secondary overflow-hidden select-none">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xl font-bold text-[var(--shell-accent)]">DV</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="logo-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadLogo(file);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploadingLogo}
                      onClick={() => document.getElementById("logo-upload")?.click()}
                      className="hover:bg-secondary"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {uploadingLogo ? "Uploading..." : "Upload Logo"}
                    </Button>
                    {state.logo_file_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setState((s) => ({ ...s, logo_file_id: null, favicon_file_id: null }));
                          setLogoPreview(null);
                        }}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {logoPreview
                      ? "Used as sidebar logo and browser tab favicon"
                      : "Upload a logo — it becomes the favicon automatically"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Brand Colors — Light / Dark tabs ──────────────────────────── */}
        <Card className="border-border hover:shadow-md transition-shadow duration-200">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold text-foreground">
                  Brand Colors
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToDefaults}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                  title="Reset all colors to system defaults from ui-theme"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset to Defaults
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setThemeEditorOpen(true)}
                  className="h-7 text-xs hover:bg-secondary cursor-pointer"
                >
                  <Paintbrush className="mr-1 h-3 w-3" />
                  Theme Editor
                </Button>
                {/* Theme tabs */}
                <div className="flex items-center rounded-lg border border-border bg-secondary p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("light")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      activeTab === "light"
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("dark")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      activeTab === "dark"
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    Dark
                  </button>
                </div>
              </div>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              {activeTab === "light"
                ? "Colors for light theme — changes apply as you pick"
                : "Colors for dark theme — changes apply as you pick"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <ThemeColorEditor
              colors={activeColors}
              onChange={handleColorChange}
              theme={activeTab}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Email Templates ──────────────────────────────────────────────── */}
      <Card className="border-border hover:shadow-md transition-shadow duration-200">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Email Templates
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Customise email sender details and default template
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Sender Name</Label>
              <Input
                value={state.email_templates.sender_name}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    email_templates: { ...s.email_templates, sender_name: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Sender Email</Label>
              <Input
                type="email"
                value={state.email_templates.sender_email}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    email_templates: { ...s.email_templates, sender_email: e.target.value },
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Email Footer Text</Label>
            <Input
              value={state.email_templates.footer}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  email_templates: { ...s.email_templates, footer: e.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">Email Logo</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary overflow-hidden">
                {emailLogoPreview ? (
                  <img src={emailLogoPreview} alt="Email Logo" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">No</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="email-logo-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadEmailLogo(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingEmailLogo}
                  onClick={() => document.getElementById("email-logo-upload")?.click()}
                  className="hover:bg-secondary"
                >
                  {uploadingEmailLogo ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {uploadingEmailLogo ? "Uploading..." : "Upload"}
                </Button>
                {state.email_templates.email_logo_file_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setState((s) => ({
                        ...s,
                        email_templates: { ...s.email_templates, email_logo_file_id: null },
                      }));
                      setEmailLogoPreview(null);
                    }}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Save Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetToDefaults}
          className="text-xs text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset to Defaults
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-secondary"
            onClick={() => window.location.reload()}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* ── Theme Editor Modal ─────────────────────────────────────────── */}
      <BrandingModal
        open={themeEditorOpen}
        onClose={() => setThemeEditorOpen(false)}
        onSave={handleThemeEditorSave}
        initialOverrides={cssOverrides}
      />
    </div>
  );
}
