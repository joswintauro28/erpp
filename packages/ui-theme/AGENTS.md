# DATAVEX ERP — UI Theme Package (`packages/ui-theme`) Agent Context

This package provides the central styling directives, Tailwind configuration variables, and Shadcn UI primitives for all frontend workstations.

## 1. Specifications
- **Theme Variables:** Styled around "Refined Crimson & Brushed Gold". CSS variables are defined inside `src/globals.css`.
  - Deep Maroon (`--sidebar`/`--shell-header`): `#3D1013`
  - Crimson Red (`--shell-brand`): `#8C1D24`
  - Brushed Gold (`--shell-accent`): `#E5B83C`
- **Tailwind Integration:** Configured to integrate with Tailwind CSS v4 via `@theme inline`.
- **Custom Animations:** Includes keyframe configurations for `kpi-enter` and `step-in` UI entries.

## 2. Exports & Components
- **Utility:** Exposes the `cn` utility (combines `clsx` and `tailwind-merge`), plus `statusVariant(domain, status)` and toast helpers.
- **UI Primitives (19):** `badge`, `button`, `card`, `dialog`, `input`, `label`, `progress`, `select`, `spinner`, `table`, `textarea`, `notification-provider`, `notification-bell`, `skeleton`, `tabs`, `toaster`, `confirm-dialog`, `tooltip`, `dropdown-menu`, `switch`, `checkbox`, `avatar`, `separator`, `pagination`, `breadcrumb`.
- **Shared Composites (11):** `multi-step-dialog`, `empty-state`, `search-input`, `loading-spinner`, `page-header`, `kpi-card`, `section-heading`, `theme-provider`, `theme-toggle`, `file-upload`, `file-viewer`.

## 3. Package Integration
- **Package Name:** `@datavex/ui-theme`
- **Path Resolution:** Next.js workstations map imports through their workspaces configuration and TS/Next path aliases (Turbopack support enabled via `next.config.ts` mapping).
- **Import convention:**
  ```typescript
  import { Button } from "@datavex/ui-theme/components/button";
  import { cn } from "@datavex/ui-theme/lib/utils";
  ```
