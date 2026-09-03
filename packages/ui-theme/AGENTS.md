# DATAVEX ERP — UI Theme (`packages/ui-theme`) Agent Context

Shared Shadcn UI primitives, custom theme, and Tailwind v4 configuration for all DATAVEX ERP frontend applications.

## 1. Package Identity
- **Package Name:** `@datavex/ui-theme`
- **Role:** Central design system — all frontend apps import components, theme tokens, and utilities from this package.

## 2. Exports

### UI Primitives (12)
badge, button, card, dialog, input, label, progress, select, spinner, table, textarea

### Shared Components (6)
- **page-header.tsx** — Standardized page header with title, subtitle, badge, and action slot. Used across all 4 frontend apps.
- **search-input.tsx** — Search input with icon and debounce.
- **empty-state.tsx** — Empty state placeholder with icon and message.
- **section-heading.tsx** — Section divider with label.
- **status-filter.tsx** — Status filter tabs.
- **ai-chat.tsx** — AI chat drawer component (SSE streaming, session management, module-aware context).

### Utilities
- **cn()** — `clsx` + `tailwind-merge` for conditional class merging.

### Re-exports
- `handleError` — Centralized error handler for API responses.
- `Button` — Re-exported from `./components/ui/button`.

## 3. Theme Configuration
- **Design System:** "Refined Crimson & Brushed Gold"
- **Tokens:** Defined in `src/globals.css` as CSS custom properties, mapped to Tailwind via `@theme inline`.
- **Key Colors:**
  - `--sidebar`/`--shell-header`: Deep Maroon (#3D1013)
  - `--shell-brand`: Crimson Red (#8C1D24)
  - `--shell-accent`: Milled Brass (#E5B83C)
  - `--radius-sm`: 4px (buttons)
  - `--radius-md`: 6px (cards)
- **Fonts:** Montserrat (headings), Inter (body), JetBrains Mono (code).
- **Animations:** `kpi-enter`, `step-in`.

## 4. Import Pattern
All frontend apps use path aliases resolved via tsconfig:
```ts
import { PageHeader, EmptyState, cn } from "@datavex/ui-theme";
import { Badge } from "@/components/ui/badge"; // maps to ui-theme
```

## 5. Adding New Components
1. Create component in `src/components/shared/` or `src/components/ui/`.
2. Export from `src/index.ts`.
3. Import in consuming apps via `@datavex/ui-theme`.
