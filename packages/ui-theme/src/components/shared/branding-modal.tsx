"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { extractDefaults, type CssVariable, type VariableType } from "../../lib/css-parser";
import { classifyVariables, type VariableCategory } from "../../lib/css-categories";
import { injectPreview, removePreview } from "../../lib/preview-injector";
import { HARDCODED_PARSED_CSS } from "../../lib/css-defaults";
import { HexColorPicker } from "../ui/color-picker";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface BrandingOverrides {
  light: Record<string, string>;
  dark: Record<string, string>;
}

interface BrandingModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (overrides: BrandingOverrides) => void;
  initialOverrides?: BrandingOverrides | null;
}

/* ── Icon Components (inline to avoid heavy dependency) ──────────────────── */

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function RotateCcw({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
    </svg>
  );
}

function Eye({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

function Download({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function Upload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

/* ── Color Presets & Resolver ───────────────────────────────────────────── */

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

function resolveColorToHex(val: string, allValues?: Record<string, string>): string {
  if (!val) return "#000000";
  let v = val.trim();

  // If CSS variable reference e.g. var(--accent) or var(--accent, #fff)
  if (v.startsWith("var(")) {
    const match = v.match(/var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,\s*([^)]+))?\s*\)/);
    if (match) {
      const varName = match[1];
      const fallback = match[2];
      if (allValues && allValues[varName]) {
        return resolveColorToHex(allValues[varName], allValues);
      }
      if (fallback) {
        return resolveColorToHex(fallback, allValues);
      }
      if (typeof window !== "undefined" && document.documentElement) {
        const comp = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        if (comp) return resolveColorToHex(comp, allValues);
      }
    }
  }

  // 3-digit hex #abc
  if (/^#([0-9A-Fa-f]{3})$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  }
  // 6-digit hex
  if (/^#([0-9A-Fa-f]{6})$/.test(v)) {
    return v.toLowerCase();
  }
  // 8-digit hex (strip alpha)
  if (/^#([0-9A-Fa-f]{8})$/.test(v)) {
    return `#${v.slice(1, 7)}`.toLowerCase();
  }
  // rgb(...)
  const rgbMatch = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, "0");
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, "0");
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`.toLowerCase();
  }

  return v.startsWith("#") ? v : "#000000";
}

/* ── Color Swatch with Rich Popover Picker ───────────────────────────────── */

function ColorSwatch({
  value,
  onChange,
  disabled,
  allValues,
}: {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  allValues?: Record<string, string>;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const nativeInputRef = React.useRef<HTMLInputElement>(null);
  const [coords, setCoords] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const resolvedHex = React.useMemo(() => resolveColorToHex(value, allValues), [value, allValues]);

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = 240;
    const panelHeight = 280;

    let left = rect.left - panelWidth + 24;
    if (left < 10) left = 10;
    if (left + panelWidth > window.innerWidth - 10) {
      left = window.innerWidth - panelWidth - 10;
    }

    let top = rect.bottom + 6;
    if (top + panelHeight > window.innerHeight - 10) {
      top = Math.max(10, rect.top - panelHeight - 6);
    }

    setCoords({ top, left });
  }, []);

  React.useEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="relative h-6 w-6 shrink-0 rounded-md border border-border shadow-xs cursor-pointer transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ring-1 ring-inset ring-black/10 dark:ring-white/20"
        title={`Pick color: ${value} (resolved: ${resolvedHex})`}
        style={{
          backgroundImage:
            "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
          backgroundSize: "8px 8px",
          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
        }}
      >
        <span
          className="absolute inset-0 block rounded-[5px]"
          style={{ backgroundColor: resolvedHex || value }}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[120] w-[240px] p-3 rounded-xl border border-border bg-card text-card-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none"
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
              <span className="text-[11px] font-semibold text-foreground">Color Picker</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Visual Color Picker */}
            <div className="overflow-hidden rounded-lg border border-border">
              <HexColorPicker
                color={resolvedHex}
                onChange={onChange}
                className="!w-full !h-[140px]"
              />
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

            {/* Direct Hex Input & Eyedropper */}
            <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-border/60">
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#rrggbb or var(--...)"
                className="flex-1 h-7 px-2 rounded-md border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    nativeInputRef.current?.showPicker?.();
                  } catch {
                    nativeInputRef.current?.click();
                  }
                }}
                className="relative h-7 w-7 shrink-0 flex items-center justify-center rounded-md border border-border bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer shadow-2xs"
                title="Open system color picker"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 22 1-1h3l9-9" />
                  <path d="M3 21v-3l9-9" />
                  <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9" />
                </svg>
                <input
                  ref={nativeInputRef}
                  type="color"
                  value={resolvedHex}
                  onChange={(e) => onChange(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/* ── Validation ──────────────────────────────────────────────────────────── */

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const SIZE_RE = /^\d+(\.\d+)?(px|rem|em|pt|vh|vw|vmin|vmax|ch|ex|cm|mm|in)$/i;

function validateValue(value: string, type: VariableType): string | null {
  const v = value.trim();
  if (!v) return "Empty value";

  if (type === "color") {
    if (!HEX_RE.test(v) && !/^(rgb|rgba|hsl|hsla|oklch|color-mix)\s*\(/.test(v)) {
      return "Invalid color (use #hex or rgb())";
    }
  }

  if (type === "size") {
    if (v === "0") return null; // 0 is valid without unit
    if (!SIZE_RE.test(v) && !/^calc\s*\(/.test(v) && !/^var\s*\(/.test(v)) {
      return "Invalid size (use px, rem, em)";
    }
  }

  return null;
}

/* ── Single Variable Row ─────────────────────────────────────────────────── */

function VariableRow({
  variable,
  value,
  onChange,
  isDefault,
  onReset,
  allValues,
}: {
  variable: CssVariable;
  value: string;
  onChange: (val: string) => void;
  isDefault: boolean;
  onReset: () => void;
  allValues?: Record<string, string>;
}) {
  const isColor = variable.type === "color";
  const error = variable.type === "color" || variable.type === "size"
    ? validateValue(value, variable.type)
    : null;

  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-border/30 last:border-0 group">
      {isColor && (
        <ColorSwatch
          value={value}
          onChange={onChange}
          allValues={allValues}
        />
      )}

      <span className="text-xs font-mono text-muted-foreground min-w-0 shrink-0 max-w-[180px] truncate" title={variable.cssVar}>
        {variable.cssVar}
      </span>

      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full h-7 px-2 rounded-md border bg-background text-xs font-mono",
            "text-foreground placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-1 transition-colors",
            error
              ? "border-red-500/60 focus:ring-red-500/30 focus:border-red-500/50"
              : "border-border/50 focus:ring-[var(--shell-brand)]/30 focus:border-[var(--shell-brand)]/50",
          )}
          title={error ?? undefined}
        />
        {error && (
          <span className="text-[9px] text-red-500 mt-0.5 block truncate">{error}</span>
        )}
      </div>

      {!isColor && (
        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground bg-border/30 px-1.5 py-0.5 rounded shrink-0">
          {variable.type === "size" ? (value.match(/\d+(px|rem|em|pt|vh|vw)/)?.[1] ?? "size") : variable.type}
        </span>
      )}

      {!isDefault && (
        <button
          type="button"
          onClick={onReset}
          className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
          title="Reset to default"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}

      {isDefault && <div className="w-6 shrink-0" />}
    </div>
  );
}

/* ── Category Section ────────────────────────────────────────────────────── */

function CategorySection({
  category,
  values,
  defaults,
  isDark,
  onResetCategory,
  onResetVariable,
}: {
  category: VariableCategory;
  values: Record<string, string>;
  defaults: { light: Record<string, string>; dark: Record<string, string> };
  isDark: boolean;
  onResetCategory: (vars: CssVariable[]) => void;
  onResetVariable: (cssVar: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const defaultBlock = isDark ? defaults.dark : defaults.light;

  const defaultCount = category.variables.filter(
    (v) => defaultBlock[v.cssVar] === values[v.cssVar],
  ).length;
  const overriddenCount = category.variables.length - defaultCount;

  return (
    <div className="border border-border/40 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {category.name}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground bg-border/30 px-1.5 py-0.5 rounded">
            {category.variables.length}
          </span>
          {overriddenCount > 0 && (
            <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {overriddenCount} changed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {overriddenCount > 0 && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onResetCategory(category.variables);
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer px-1"
            >
              Reset all
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              !expanded && "-rotate-90",
            )}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-3 py-1.5 space-y-0">
          {category.variables.map((v) => (
            <VariableRow
              key={v.cssVar}
              variable={v}
              value={values[v.cssVar] ?? v.value}
              onChange={(val) => {
                // Trigger change
                const event = new CustomEvent("branding-change", {
                  detail: { cssVar: v.cssVar, value: val, isDark },
                });
                window.dispatchEvent(event);
              }}
              isDefault={defaultBlock[v.cssVar] === values[v.cssVar]}
              onReset={() => onResetVariable(v.cssVar)}
              allValues={values}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Modal ──────────────────────────────────────────────────────────── */

export function BrandingModal({
  open,
  onClose,
  onSave,
  initialOverrides,
}: BrandingModalProps) {
  // Use hardcoded defaults from globals.css (works in Docker/SSR builds)
  const parsed = React.useMemo(() => HARDCODED_PARSED_CSS, []);
  const defaults = React.useMemo(() => extractDefaults(parsed), [parsed]);

  // Classify light variables (same categories for both themes)
  const categories = React.useMemo(
    () => classifyVariables(parsed.light),
    [parsed],
  );

  // Active theme tab
  const [activeTab, setActiveTab] = React.useState<"light" | "dark">("light");

  // Override state — merge initial overrides with defaults
  const [overrides, setOverrides] = React.useState<BrandingOverrides>(() => ({
    light: { ...defaults.light, ...initialOverrides?.light },
    dark: { ...defaults.dark, ...initialOverrides?.dark },
  }));

  // Preview mode
  const [previewing, setPreviewing] = React.useState(false);

  // Sync initial overrides when they change
  React.useEffect(() => {
    if (initialOverrides) {
      setOverrides({
        light: { ...defaults.light, ...initialOverrides.light },
        dark: { ...defaults.dark, ...initialOverrides.dark },
      });
    }
  }, [initialOverrides, defaults]);

  // Listen for variable changes from VariableRow
  React.useEffect(() => {
    const handler = (e: Event) => {
      const { cssVar, value, isDark } = (e as CustomEvent).detail;
      setOverrides((prev) => ({
        ...prev,
        [isDark ? "dark" : "light"]: {
          ...prev[isDark ? "dark" : "light"],
          [cssVar]: value,
        },
      }));
    };
    window.addEventListener("branding-change", handler);
    return () => window.removeEventListener("branding-change", handler);
  }, []);

  // Live preview injection
  React.useEffect(() => {
    if (previewing) {
      injectPreview(overrides);
    } else {
      removePreview();
    }
    return () => removePreview();
  }, [previewing, overrides]);

  // Get active values
  const activeValues = activeTab === "light" ? overrides.light : overrides.dark;

  // Reset single variable
  const handleResetVariable = React.useCallback(
    (cssVar: string) => {
      const defaultValue = activeTab === "light" ? defaults.light[cssVar] : defaults.dark[cssVar];
      if (defaultValue) {
        setOverrides((prev) => ({
          ...prev,
          [activeTab]: { ...prev[activeTab], [cssVar]: defaultValue },
        }));
      }
    },
    [activeTab, defaults],
  );

  // Reset category
  const handleResetCategory = React.useCallback(
    (variables: CssVariable[]) => {
      setOverrides((prev) => {
        const block = { ...prev[activeTab] };
        for (const v of variables) {
          const def = activeTab === "light" ? defaults.light[v.cssVar] : defaults.dark[v.cssVar];
          if (def) block[v.cssVar] = def;
        }
        return { ...prev, [activeTab]: block };
      });
    },
    [activeTab, defaults],
  );

  // Reset all
  const handleResetAll = React.useCallback(() => {
    setOverrides({ light: { ...defaults.light }, dark: { ...defaults.dark } });
  }, [defaults]);

  // Save
  const handleSave = React.useCallback(() => {
    onSave(overrides);
    setPreviewing(false);
    removePreview();
    onClose();
  }, [overrides, onSave, onClose]);

  // Export theme as JSON
  const handleExport = React.useCallback(() => {
    const blob = new Blob([JSON.stringify(overrides, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `datavex-theme-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [overrides]);

  // Import theme from JSON
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleImport = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const handleImportFile = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        if (imported && typeof imported === "object" && imported.light && imported.dark) {
          setOverrides(imported);
        }
      } catch {
        // Invalid JSON — silently ignore
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // Close on escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewing(false);
        removePreview();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={() => {
          setPreviewing(false);
          removePreview();
          onClose();
        }}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-[100] w-full max-w-[520px] bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Theme Editor
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edit CSS variables from globals.css directly
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPreviewing(false);
              removePreview();
              onClose();
            }}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Theme Tabs + Controls */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("light")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                activeTab === "light"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dark")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                activeTab === "dark"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Dark
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={handleImport}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
              title="Import theme from JSON file"
            >
              <Upload className="h-3 w-3" />
              Import
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
              title="Export theme as JSON file"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              type="button"
              onClick={handleResetAll}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
              title="Reset all to defaults"
            >
              <RotateCcw className="h-3 w-3" />
              Reset All
            </button>

            <button
              type="button"
              onClick={() => setPreviewing(!previewing)}
              className={cn(
                "flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                previewing
                  ? "bg-primary/10 text-primary border border-[var(--shell-brand)]/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-background",
              )}
              title="Toggle live preview"
            >
              {previewing ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {previewing ? "Preview On" : "Preview"}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {categories.map((cat) => (
            <CategorySection
              key={cat.name}
              category={cat}
              values={activeValues}
              defaults={defaults}
              isDark={activeTab === "dark"}
              onResetCategory={handleResetCategory}
              onResetVariable={handleResetVariable}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-background z-10 shrink-0">
          <p className="text-[10px] text-muted-foreground">
            {Object.keys(overrides.light).length + Object.keys(overrides.dark).length} variables loaded from globals.css
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPreviewing(false);
                removePreview();
                onClose();
              }}
              className="h-8 px-3 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background border border-border transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
