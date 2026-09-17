"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { parseGlobalsCss, extractDefaults, type CssVariable, type ParsedCss } from "../../lib/css-parser";
import { classifyVariables, type VariableCategory } from "../../lib/css-categories";
import { injectPreview, removePreview } from "../../lib/preview-injector";

// @ts-expect-error — ?raw import supported by Next.js / Turbopack
import globalsCssText from "../../globals.css?raw";

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

/* ── Color Swatch with Lazy Picker ──────────────────────────────────────── */

function ColorSwatch({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      className="h-6 w-6 shrink-0 rounded-md border border-[var(--shell-border)] shadow-sm cursor-pointer transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: value }}
      title={`Pick color (current: ${value})`}
    >
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
    </button>
  );
}

/* ── Single Variable Row ─────────────────────────────────────────────────── */

function VariableRow({
  variable,
  value,
  onChange,
  isDefault,
  onReset,
}: {
  variable: CssVariable;
  value: string;
  onChange: (val: string) => void;
  isDefault: boolean;
  onReset: () => void;
}) {
  const isColor = variable.type === "color";

  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-[var(--shell-border)]/30 last:border-0 group">
      {isColor && (
        <ColorSwatch
          value={value}
          onChange={onChange}
        />
      )}

      <span className="text-xs font-mono text-[var(--shell-muted)] min-w-0 shrink-0 max-w-[180px] truncate" title={variable.cssVar}>
        {variable.cssVar}
      </span>

      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full h-7 px-2 rounded-md border border-[var(--shell-border)]/50 bg-[var(--shell-bg)] text-xs font-mono",
            "text-[var(--shell-foreground)] placeholder:text-[var(--shell-muted)]/50",
            "focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]/30 focus:border-[var(--shell-brand)]/50",
            "transition-colors",
          )}
        />
      </div>

      {!isColor && (
        <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--shell-muted)] bg-[var(--shell-border)]/30 px-1.5 py-0.5 rounded shrink-0">
          {variable.type === "size" ? (value.match(/\d+(px|rem|em|pt|vh|vw)/)?.[1] ?? "size") : variable.type}
        </span>
      )}

      {!isDefault && (
        <button
          type="button"
          onClick={onReset}
          className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0 flex items-center justify-center rounded text-[var(--shell-muted)] hover:text-[var(--shell-foreground)] hover:bg-[var(--shell-surface-alt)] transition-all cursor-pointer"
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
    <div className="border border-[var(--shell-border)]/40 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--shell-surface)] hover:bg-[var(--shell-surface-alt)] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--shell-foreground)]">
            {category.name}
          </span>
          <span className="text-[10px] font-mono text-[var(--shell-muted)] bg-[var(--shell-border)]/30 px-1.5 py-0.5 rounded">
            {category.variables.length}
          </span>
          {overriddenCount > 0 && (
            <span className="text-[10px] font-mono text-[var(--shell-brand)] bg-[var(--shell-brand)]/10 px-1.5 py-0.5 rounded">
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
              className="text-[10px] text-[var(--shell-muted)] hover:text-[var(--shell-foreground)] cursor-pointer px-1"
            >
              Reset all
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[var(--shell-muted)] transition-transform",
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
  // Parse globals.css
  const parsed = React.useMemo(() => parseGlobalsCss(globalsCssText as string), []);
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
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          setPreviewing(false);
          removePreview();
          onClose();
        }}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[520px] bg-[var(--shell-bg)] border-l border-[var(--shell-border)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--shell-border)]">
          <div>
            <h2 className="font-heading text-base font-semibold text-[var(--shell-foreground)]">
              Theme Editor
            </h2>
            <p className="text-xs text-[var(--shell-muted)] mt-0.5">
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
            className="h-8 w-8 flex items-center justify-center rounded-md text-[var(--shell-muted)] hover:text-[var(--shell-foreground)] hover:bg-[var(--shell-surface-alt)] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Theme Tabs + Controls */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--shell-border)]/50 bg-[var(--shell-surface)]">
          <div className="flex items-center rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("light")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                activeTab === "light"
                  ? "bg-[var(--shell-brand)] text-white shadow-sm"
                  : "text-[var(--shell-muted)] hover:text-[var(--shell-foreground)]",
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
                  ? "bg-[var(--shell-brand)] text-white shadow-sm"
                  : "text-[var(--shell-muted)] hover:text-[var(--shell-foreground)]",
              )}
            >
              Dark
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs text-[var(--shell-muted)] hover:text-[var(--shell-foreground)] hover:bg-[var(--shell-bg)] transition-colors cursor-pointer"
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
                  ? "bg-[var(--shell-brand)]/10 text-[var(--shell-brand)] border border-[var(--shell-brand)]/30"
                  : "text-[var(--shell-muted)] hover:text-[var(--shell-foreground)] hover:bg-[var(--shell-bg)]",
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
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <p className="text-[10px] text-[var(--shell-muted)]">
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
              className="h-8 px-3 rounded-md text-xs font-medium text-[var(--shell-muted)] hover:text-[var(--shell-foreground)] hover:bg-[var(--shell-bg)] border border-[var(--shell-border)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-8 px-4 rounded-md text-xs font-medium bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-brand)]/90 transition-colors cursor-pointer shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
