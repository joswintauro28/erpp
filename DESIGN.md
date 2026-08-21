# DATAVEX ERP — Global Design System & UI/UX Design Language

This document is the **single source of truth** for the DATAVEX ERP visual system across all monorepo applications (`erp-shell`, `crm-ui`, `billing-ui`, `inventory-ui`) and the shared package `@datavex/ui-theme`.

It is written from an audit of the actual shipped UI (August 2026). Where the old spec and the code disagreed, this document resolves the conflict and declares the canonical rule. Every rule below is **enforced** by the conformance checklist in §15 and the design-debt register in §16.

---

## 1. Design System Philosophy & Vision

**"Refined Crimson & Milled Brass"** — industrial precision, executive authority, and calm density. The system blends a deep maroon/crimson chassis with milled-brass gold accents, high-contrast type, and restrained motion. It is built for **high-frequency enterprise operators** (sales reps, accountants, inventory managers), not marketing sites: speed of scan, clarity of state, and zero ambiguity about "what needs my attention."

### 1.1 Core Pillars

| Pillar | Meaning in practice |
| :--- | :--- |
| **Executive authority** | Deep maroon chassis (`#3D1013`) + oxide crimson primary (`#8C1D24`) communicate trust and security. |
| **Density without clutter** | 8px rhythm, compact controls (36px), right-aligned numerics, micro-caps headers — a full table row must be scannable in under a second. |
| **State clarity** | Every status (paid/hold/overdue/approved…) renders as one canonical semantic badge. No two dialects, no guessing. |
| **Progressive disclosure** | Wizards for complex creation, dialogs for detail, kanban for pipeline — the user never sees more than they asked for. |
| **Consistency across workstations** | One token set, one component library, one chassis. crm-ui, billing-ui, and inventory-ui are the *same product* wearing domain badges. |

---

## 2. Design Principles (Modern UI/UX)

1. **Consistency beats novelty.** One button, one input, one badge. Reuse `@datavex/ui-theme` primitives; never hand-roll a control or a status color map. (Violation example found in audit: three different invoice-status badge implementations across apps.)
2. **Feedback on every action.** Every click resolves: optimistic UI + toast on success, inline error on failure, disabled state while busy, skeleton while loading. A UI that does not answer is broken.
3. **Explicit hierarchy.** Section eyebrows, card titles, body, captions — exactly four visible type levels (see §4). If two elements compete for the eye, one of them is wrong.
4. **Proximity encodes relationship.** `label → control = 6px`, `field → field = 16px`, `card → card = 20px`, `section → section = 40px`. Inner gaps are always ≤ half the outer gap.
5. **Status is color + icon + text.** Never color alone. Badges carry text; icons carry semantic glyphs; alerts carry both. This is also the WCAG rule (§13).
6. **Design for the empty, loading, and error states first.** Every data view ships an `EmptyState`, a skeleton, and a retry path — not just the happy path.
7. **Density is a feature.** Enterprise users scan hundreds of rows. Compact controls (h-9), 11px micro-caps table headers, and mono financial figures are the product, not a compromise.
8. **Progressive disclosure.** Hide advanced actions behind "More", collapse legacy detail into tabs, keep create-flows to 2–4 wizard steps max.
9. **Accessibility is not optional.** AA contrast minimum, visible focus rings everywhere, keyboard navigable tables/dialogs/kanban, `prefers-reduced-motion` respected.
10. **Motion is functional.** 150–300ms, one easing curve, one reason per animation (focus, state change, position). No bouncing, no flourish.

---

## 3. Color System & Design Tokens

All colors are CSS custom properties in `packages/ui-theme/src/globals.css`, surfaced to Tailwind v4 via `@theme inline`.

### 3.1 Canonical Crimson Family — ONE red, not eight

The audit found **8 distinct reds** shipped in app code (`#8C1D24`, `#C81D25`, `#A0171E`, `#70171D`, `#72161B`, `#991B1B`, `#B32428`, `#dc2626`). **This must collapse to four semantic roles:**

| Token | Value | Role | Ban these in new code |
| :--- | :--- | :--- | :--- |
| `--shell-brand` | `#8C1D24` | Primary anchor — buttons, active nav, focus | `#C81D25`, `#70171D`, `#72161B` |
| `--shell-action` | `#A0171E` | Hover/active state of primary actions | `#B32428` |
| `--shell-header` | `#3D1013` | Deep maroon chassis (sidebar, header) | — |
| `--shell-danger` | `#991B1B` | Destructive & error only | `#dc2626`, `#b91c1c`, `#be123c` |

### 3.2 Core Palette

| Token | Light | Dark (reserved) | Usage |
| :--- | :--- | :--- | :--- |
| `--shell-brand` | `#8C1D24` | `#E0525C` | Primary buttons, active states, brand marks |
| `--shell-action` | `#A0171E` | `#F06268` | Primary hover, pressed |
| `--shell-header` | `#3D1013` | `#1A0709` | Sidebar & header chassis |
| `--shell-accent` | `#E5B83C` | `#F3CE66` | Milled brass — highlights, "soon" tags, accent icons |
| `--shell-accent-surface` | `#FEF9E7` | `#2D230B` | Cream field behind gold text |
| `--shell-accent-text` | `#785808` | `#FCE8B3` | Contrast-safe brass text |

> **Dark mode status:** the `.dark` token block exists but **no theme toggle ships** in any app. Light mode is the shipped default. Do not add `dark:` utility variants to new UI — they are dead code until a toggle lands (see §16, D-08).

### 3.3 Surface & Canvas

| Token | Light | Dark (reserved) | Usage |
| :--- | :--- | :--- | :--- |
| `--shell-bg` | `#FAFAFA` | `#0F1115` | Page canvas |
| `--shell-surface` | `#FFFFFF` | `#151922` | Cards, panels, inputs |
| `--shell-surface-alt` | `#F3F4F6` | `#1F242F` | Table header rails, inset blocks, step-form footer |
| `--shell-popover` | `#FFFFFF` | `#1C212D` | Menus, tooltips, dropdowns, notification panel |
| `--shell-foreground` | `#111827` | `#F9FAFB` | Primary text (AAA) |
| `--shell-muted` | `#4B5563` | `#9CA3AF` | Secondary text, timestamps, placeholders |
| `--shell-border` | `#E5E7EB` | `rgba(255,255,255,0.08)` | Structural dividers |
| `--shell-ring` | `#8C1D24` | `#A82E35` | Focus rings |

### 3.4 Status & Feedback Tokens

| Semantic | Text token | Surface tint | Meaning |
| :--- | :--- | :--- | :--- |
| **Success** | `--shell-success` `#166534` | `#F0FDF4` | Paid, delivered, active, verified |
| **Warning** | `--shell-warning` `#9A3412` | `#FFF7ED` | Hold, low stock, pending approval, expiring |
| **Danger** | `--shell-danger` `#991B1B` | `#FEF2F2` | Overdue, rejected, failed, cancelled |
| **Info** | `--shell-info` `#1E40AF` | `#EFF6FF` | Draft, syncing, informational |
| **Neutral** | `--shell-muted` `#4B5563` | `#F3F4F6` | Void, inactive, archived, "not checked" |

> `--shell-info` must be added to `globals.css` (it is referenced in docs but not defined as a token).

---

## 4. Typography Architecture

Three families, loaded via `next/font/local` variable fonts in every app:
`Montserrat` (headings) · `Inter` (body) · `JetBrains Mono` (figures/codes).

### 4.1 Scale & Usage

| Role | Family | Size / Weight | Line-height | Used for |
| :--- | :--- | :--- | :--- | :--- |
| Display | Montserrat | `28px` / 700, `-0.02em` | 1.2 | Dashboard hero figures (donut center totals) |
| H1 | Montserrat | `20px` / 600, `-0.01em` | 1.25 | Page titles, dialog titles |
| H2 | Montserrat | `16px` / 600 | 1.3 | Card titles |
| H3 | Montserrat | `14px` / 600 | 1.4 | Sub-card headers, table group headers |
| Body | Inter | `14px` / 400–500 | 1.5 | Table cells, list rows, descriptions |
| Caption | Inter | `12px` / 400–500 | 1.4 | Helpers, timestamps, secondary meta |
| Micro-caps | Montserrat | `11px` / 600–700, `+0.08em`, `uppercase` | 1.0 | **Section eyebrows, table headers, badges** |
| Field label | Inter | `13px` / 500, sentence case | 1.4 | **Form labels** (see §4.2) |
| Financial/Code | JetBrains Mono | `13px` / 500 | 1.3 | Invoice numbers, SKUs, amounts, GST, IDs, percentages |

### 4.2 Micro-caps: where they belong — and where they don't

Micro-caps are the DATAVEX signature, but overuse hurts scannability. Canonical split:

- ✅ **Micro-caps (11px / uppercase / 0.08em):** section eyebrows (`OVERVIEW`, `RECORDS`), table column headers, card eyebrow labels, badge text, sidebar group labels.
- ❌ **Never micro-caps:** form field labels (use **sentence case 13px/500 muted** — modern, i18n-safe, faster to read), button text (use `14px` sentence case), modal body text.

### 4.3 Canonical class recipes

```tsx
// Section eyebrow + divider (consistent across all pages)
<h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">
  Overview
</h2>
<div className="h-px flex-1 bg-[var(--shell-border)]" />

// Table header cell
<TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">
  Invoice No
</TableHead>

// Form label
<Label className="text-[13px] font-medium text-[var(--shell-foreground)]">Customer name</Label>

// Financial figure
<span className="font-mono text-sm font-medium tabular-nums">{money(amount)}</span>
```

---

## 5. Spacing, Layout & Geometry

### 5.1 Grid & Rhythm

- Base unit **4px**; all spacing is a multiple of 4.
- Page gutter: `p-6 lg:p-8`. Content max-width: `1600px` (centered on very wide screens).
- Section stack: `space-y-10 lg:space-y-12`. Card grids: `gap-4` (KPI), `gap-6` (charts/tables).
- Control stack in forms: `space-y-4` between fields, `gap-1.5` between label and control.

### 5.2 Corner Radius — canonical assignment

Token values in `globals.css` stay unchanged (`sm=4, md=6, lg=8, xl=12, 2xl=16`); **usage is redefined** to fix the audit's 4px-button vs 8px-input mismatch:

| Token | Value | Canonical usage |
| :--- | :--- | :--- |
| `--radius-sm` | `4px` | Inline chips, tiny tag corners, compact micro-elements |
| `--radius-md` | `6px` | **ALL controls**: buttons, inputs, selects, textareas, dropdown items |
| `--radius-lg` | `8px` | Inset panels, tooltips, table containers, stat chips |
| `--radius-xl` | `12px` | **Cards, dialogs, popovers, drawers, notification panel** |
| `--radius-2xl` | `16px` | Top-level chassis containers (login card, workspace panels) |
| pill | `9999px` | Badges, status pills, avatars, progress, unread dots, module tags |

> Existing primitives that must converge: `Button` `rounded-sm` → `rounded-md`; `Input`/`SelectTrigger` `rounded-lg` → `rounded-md`; `Card`/`DialogContent` stay `rounded-xl` (12px is correct per this table).

### 5.3 Alignment Rules

- **Text columns**: left-aligned.
- **Numeric columns** (amount, qty, %, count): right-aligned, `tabular-nums`, `font-mono` for money.
- **Status badges**: center-aligned in their column.
- **Actions column**: right-aligned, icon buttons (`h-7 w-7`), ghost until hover.

---

## 6. Elevation & Layering

```
Layer 3 (z-50) — toasts, modals, dropdowns/popovers, notification panel, flyout menus
Layer 2 (z-40) — sticky sidebar, sticky header
Layer 1 (z-30) — sticky table headers, in-card floating controls
Layer 0       — cards, tables, canvas
```

| Token | Definition | Used by |
| :--- | :--- | :--- |
| `--shadow-engineered` | `0 1px 3px rgba(17,24,37,.04), 0 4px 12px rgba(17,24,37,.06)` | Cards (hover), header |
| `--shadow-overlay` | `0 12px 32px rgba(17,24,37,.12), 0 4px 8px rgba(17,24,37,.04)` | Modals, popovers, flyouts |

- Modal backdrop: `bg-black/50 backdrop-blur-xs`.
- Cards: flat by default (`border border-[var(--shell-border)]`), lift on hover only for *clickable* cards (`hover:shadow-engineered hover:-translate-y-0.5`).

---

## 7. Status & Feedback System

### 7.1 One badge dialect (resolve the audit's two dialects)

The audit found two competing patterns:

- **Dialect A (canonical):** `Badge variant={...}` with semantic variants — erp-shell, crm-ui.
- **Dialect B (forbidden):** per-page `statusStyles` maps of raw Tailwind classes (`bg-amber-50 text-amber-700 rounded-full`) — billing-ui invoices, some inventory pages.

**Canonical rule:** extend the shared `Badge` primitive with semantic variants and use them **everywhere**:

| Variant | Classes (light) |
| :--- | :--- |
| `success` | `bg-[#F0FDF4] text-[--shell-success] border-[#166534]/20` |
| `warning` | `bg-[#FFF7ED] text-[--shell-warning] border-[#9A3412]/20` |
| `danger` | `bg-[#FEF2F2] text-[--shell-danger] border-[#991B1B]/20` |
| `info` | `bg-[#EFF6FF] text-[--shell-info] border-[#1E40AF]/20` |
| `neutral` | `bg-[--shell-surface-alt] text-[--shell-muted] border-[--shell-border]` |
| `default` | `bg-primary text-primary-foreground` (brand-fill, for counts/emphasis) |

All badges: pill (`rounded-full`), `h-5`, `text-[11px] font-semibold`, `capitalize` unless the domain value is an enum the user must read exactly (e.g. `partially_paid` → `Partially paid`).

### 7.2 Domain → status mapping (canonical)

| Domain | Statuses → variant |
| :--- | :--- |
| Invoice | `paid`→success, `partially_paid`→warning, `sent`→info, `pending`→warning, `draft`→info, `overdue`→danger, `void`/`cancelled`→neutral |
| Quotation | `draft`→neutral, `sent`→info, `accepted`→success, `expired`→neutral, `rejected`→danger, `converted`→success |
| Sales Order | `draft`→neutral, `confirmed`→info, `credit_pending`→warning, `hold`→warning, `approved`→success, `dispatched`→success, `delivered`→success, `invoiced`→success, `paid`→success, `cancelled`→danger |
| Lead | `new`→info, `qualified`→success, `mql`→warning, `converted`→success, `lost`→neutral |
| Customer | `active`→success, `at_risk`→warning, `overdue`→danger, `inactive`→neutral |
| Stock | `in_stock`→success, `low`→warning, `out_of_stock`→danger |
| Purchase Order | `draft`→neutral, `ordered`→info, `received`→success, `cancelled`→danger |
| Payment | `completed`→success, `pending`→warning, `failed`→danger, `refunded`→neutral |

> Ship ONE shared `statusVariant(domain, status)` helper in `@datavex/ui-theme` and delete the ~15 per-page maps (D-03).

### 7.3 Notifications (bell) — type system

`NotificationBell`/`NotificationProvider` in ui-theme. Notification `type` enum and rendering:

| Type | Icon | Surface (10% tint) | Used for |
| :--- | :--- | :--- | :--- |
| `INFO` | `Info` | blue | System info, version updates |
| `SUCCESS` | `CheckCircle2` | emerald | Approved, dispatched, paid |
| `WARNING` | `AlertTriangle` | amber | Hold, overdue, low stock |
| `ERROR` | `XCircle` | red | Credit check failed, rejected |
| `ACTION` | `ClipboardCheck` | crimson (`--shell-brand`) | Requires review/approval (the bell's primary job) |

Unread = bold title + brand dot; read = medium title + check. Panel: `w-96`, `rounded-lg` (12px), `shadow-lg`, header with Live/Offline status. Module badges (`CRM`/`BILLING`/`INVENTORY`) use the domain badge palette (§14).

---

## 8. Component Inventory & States

### 8.1 Primitive inventory (`@datavex/ui-theme`)

**Shipped (26):** `Button`, `Badge`, `Card`, `Dialog`, `Input`, `Label`, `Progress`, `Select`, `Spinner`, `Table`, `Textarea`, `NotificationBell`+`NotificationProvider`, `Skeleton`, `Tabs`, `Toaster`, `ConfirmDialog` (`ConfirmProvider`/`useConfirm`), `Tooltip`, `DropdownMenu`, `Switch`, `Checkbox`, `Avatar`, `Separator`, `Pagination`, `Breadcrumb`, plus shared composites `MultiStepDialog`, `EmptyState`, `SearchInput`, `LoadingSpinner`.

**Shared modules:** `statusVariant(domain, status)` in `utils/status.ts`, module-level toasts in `utils/toast.ts`.

> The full D-14 primitive set from the audit is shipped. Anything not listed above is intentionally not part of the shared kit (e.g. `Slider`, `RadioGroup` — add to ui-theme before building new pages that need them).

### 8.2 Interactive states (mandatory for every control)

| State | Rule |
| :--- | :--- |
| Default | Token-driven (never raw hex) |
| Hover | `hover:bg-muted` (ghost) / `hover:bg-[var(--shell-action)]` (primary) |
| Focus-visible | `ring-2 ring-ring ring-offset-2 ring-offset-background` — never `outline: none` without a ring |
| Active/Pressed | `active:scale-[0.98]` (buttons), `active:translate-y-px` |
| Disabled | `opacity-50 pointer-events-none` (or `cursor-not-allowed` for links) |
| Busy | In-button `Spinner` + `disabled`; never a full-page lock for a single action |
| Error | `aria-invalid` → destructive border + ring + inline message below field |
| Selected (rows) | `data-[state=selected]:bg-muted` |

### 8.3 Component specs (quick reference)

| Component | Canonical |
| :--- | :--- |
| Button | `h-9` standard / `h-7` compact / `h-7 w-7` icon. Default = brand fill. Variants: `default, secondary, outline, ghost, destructive, link` |
| Input / Select / Textarea | `h-9` (textarea min-h), `rounded-md` (6px), `border-input bg-transparent`, focus ring brand |
| Card | `rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]`; padding `p-4`/`p-5`; title `text-sm font-semibold font-heading` |
| Dialog | `max-w-sm` default, `max-w-lg` forms, `max-w-2xl` complex; `rounded-xl`, `p-4`, footer `bg-muted/50 border-t` |
| Badge | `h-5 rounded-full text-[11px] font-semibold` (see §7.1) |
| Table | Contained in Card; header row `bg-[var(--shell-surface-alt)]`; rows `py-2.5`; hover `bg-muted/50`; no raw DB ID columns — human codes (`INV-…`, `SO-…`) in `font-mono` |
| KPI Card | `rounded-xl border p-5`; micro-caps label; `font-heading text-2xl font-semibold` value; icon chip `h-7 w-7 rounded-md`; optional trend; `animate-kpi` stagger `index * 0.05s` |
| EmptyState | Icon `h-12 w-12` muted, title `text-base font-medium`, description, optional action, `py-20` centered |
| MultiStepDialog | Header: title + `Step x / n` + StepIndicator (done=brass check, active=brand ring, pending=outline); body `step-form`; footer Back/Cancel/Next |
| Toast | Top-right stack, `shadow-overlay`, auto-dismiss 4s, dismissible, type icon per §7.3 palette |

### 8.4 Empty / loading / error states

- **Loading:** `Skeleton` blocks (to add) for lists/charts; centered `Spinner` only for full-page loads.
- **Empty:** shared `EmptyState` with a domain icon + a *useful* primary action ("New Invoice", "Add Product").
- **Error:** inline alert card (danger tint) with **Retry** button; never a silent `catch {}` that leaves a perpetual spinner (audit found several).
- **Table empty row:** centered muted message spanning all columns, minimum `py-8`.

---

## 9. Page Patterns (anatomy)

### 9.1 List page (customers, invoices, products, leads…)

```
Section eyebrow (micro-caps) + divider
├── KPI strip        → 2–4 compact stat cards (grid-cols-2 lg:grid-cols-4)
Section eyebrow (micro-caps) + divider
├── Toolbar          → [Refresh] [Export] [Primary Action]  (left-aligned, h-9)
├── Table Card       → search + filter row (border-b), then Table
└── <Entity>CreateModal + <Entity>DetailsModal (local to route folder)
```

### 9.2 Detail page (invoice [id], SO [id]…)

- Header: entity code in `font-mono`, H1 title, status badge, primary action cluster (right).
- Progress/status stepper for lifecycle entities (quotation → SO → dispatch → invoice → paid).
- Body: summary cards (top), tabbed sections or stacked cards (below).
- Money always `font-mono tabular-nums`; GST breakdown in its own inset panel (`bg-[var(--shell-surface-alt)] rounded-md`).

### 9.3 Dashboard

- Alert banner (accent tint) only when attention items exist — never a permanent fixture.
- KPI grid: 6 across on `lg` for exec shell, 4 across for workstations.
- Charts in cards, `lg:grid-cols-2`, consistent 11px muted axes (§11).
- Section stack: Overview → Quick Actions → Analytics → Pipeline → Activity → Summary.

### 9.4 Kanban (opportunities, invoices)

- Columns: `w-72`, header with count badge, `bg-[var(--shell-surface-alt)]/50 rounded-lg` lane, `rounded-md` cards, drag cursor + grab affordance, drop-hover ring.
- Card: title (semibold), value (`font-mono`), status badge, owner.

### 9.5 Login / auth

- Centered card `max-w-md`, `rounded-xl`, `shadow-overlay`; brand mark top; field errors inline under fields (already implemented — keep); submit `h-9` full width.

---

## 10. Forms & Validation

- Layout: single-column `space-y-4`; 2-col grid only when both fields are short and related (e.g. city/state).
- **Labels:** sentence case 13px/500 (see §4.2) — migrate the `.step-form` uppercase override.
- **Required:** `*` in brand color, not the word "required".
- **Validation:** validate on blur + submit; inline message `text-xs text-[var(--shell-danger)]` below the field; input gets `aria-invalid` + destructive ring.
- **Errors:** top-of-form alert (danger tint) summarizing blocking issues; toast only for *successful* saves.
- **Submitting:** primary button shows `Spinner` + is disabled; dialog footer buttons lock; never allow double submit.
- **Confirmation:** destructive actions use a confirm dialog (never `window.confirm` — audit found raw `confirm()` calls in pages); destructive button `variant="destructive"`.

---

## 11. Data Visualization

- **Palette:** `--chart-1..5` tokens only. Semantic lock: revenue/primary=`chart-1` (crimson), accent/highlight=`chart-2` (brass), secondary=`chart-3..5`. Never more than 5 categorical series.
- **Axis style:** `tick={{ fontSize: 11, fill: "var(--shell-muted)" }}`, no axis lines, `tickLine={false}`, dashed grid `stroke="var(--shell-border)" strokeOpacity={0.4}`.
- **Tooltip:** `background: var(--shell-popover)`, 1px border, `borderRadius: 8`, `fontSize: 13`, soft shadow.
- **Area charts:** brand stroke 2.5px + linear gradient fill (opacity 0.25 → 0); dots `r:3` with surface stroke.
- **Donut:** center stat (Display type + micro-caps label), `paddingAngle={3}`, surface stroke separators, legend with count + % in mono.
- **Bars:** `radius={[4,4,0,0]}`, `maxBarSize={48}`.

---

## 12. Motion & Micro-Interactions

- **Duration:** 150–300ms. **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) for enters, ease-out for exits.
- **Allowed animations:** `animate-kpi` (staggered KPI enter), `animate-step-in` (wizard step slide), modal `fade-in + zoom-in-95`, hover lifts, `pulse-sweep` header line (only on the shell header).
- **Rule:** one animation per element per event; never animate layout properties (`width`/`height`/`top`) — animate transforms + opacity.
- **Reduced motion:** wrap decorative animations in `@media (prefers-reduced-motion: reduce)` and disable; keep only opacity cross-fades. This is **not yet implemented** — required (D-06).

---

## 13. Accessibility (WCAG)

| Requirement | Rule |
| :--- | :--- |
| Contrast | Body text ≥ 4.5:1 (AA); large text ≥ 3:1; tokens already AAA-verified |
| Focus | Visible `ring-2 ring-ring ring-offset-2` on all interactive elements; nothing loses focus silently |
| Keyboard | Full tab order; dialogs trap focus + Escape closes; kanban items draggable via keyboard alternative (menu) |
| Labels | Every input has `<Label>` or `aria-label` (SearchInput already does) |
| Status | Never color-only — badges carry text, icons carry glyphs |
| Semantic HTML | `button` for actions, `th scope` on headers, `role="progressbar"` on steppers |
| Motion | `prefers-reduced-motion` support (D-06) |
| Touch targets | ≥ 28px for icon buttons, ≥ 36px for primary actions |

---

## 14. Workstation Architecture & Navigation

```
       erp-shell (3000) — Command Center
   ┌──────────┼──────────────┬──────────────┐
CRM (3001)  Billing (3002)   Inventory (3004)
```

### 14.1 Chassis

- **Sidebar:** Deep maroon `bg-sidebar`, `260px` expanded / `64px` collapsed (300ms ease), group headers micro-caps, active = brand fill + white, section rail `border-l` indent `ml-4 pl-4`, user footer with initials avatar + role, collapsed flyout menus (`shadow-overlay`).
- **Header:** `h-20`, `border-b`, `shadow-engineered`, collapse toggle, page title (`font-heading text-lg`), global search (`h-9 rounded-md`), NotificationBell, pulse-sweep accent line at the bottom edge.
- **Main:** `bg-[var(--shell-bg)] p-6 lg:p-8`, scroll container.

### 14.2 Domain badge palette (module tags)

| Domain | Badge |
| :--- | :--- |
| ERP Shell | maroon (`bg-[var(--shell-header)] text-[var(--shell-accent)]`) |
| CRM | blue tint (`bg-blue-500/10 text-blue-500`) |
| Billing | emerald tint (`bg-emerald-500/10 text-emerald-500`) |
| Inventory | amber tint (`bg-amber-500/10 text-amber-500`) |

Used for: workstation switch pills, notification module tags, chart series grouping.

---

## 15. Conformance Checklist (before committing UI code)

- [ ] **No raw hex in app components** — only `var(--shell-*)` / semantic Tailwind tokens. The one allowed exception: literal tint pairs in the canonical §7.1 badge recipe.
- [ ] **No per-page status maps** — use the shared `statusVariant(domain, status)`.
- [ ] **No `dark:` variants** (dark mode is reserved, not shipped).
- [ ] **Controls are `h-9`, `rounded-md`**, buttons use semantic variants.
- [ ] **Micro-caps only for eyebrows/table headers/badges**; form labels are 13px sentence case.
- [ ] **Numerics right-aligned + `font-mono tabular-nums`**; no raw DB ID columns.
- [ ] **States complete:** hover, focus-visible ring, disabled, busy spinner, error inline, empty state, skeleton.
- [ ] **No `window.confirm` / `alert`** — use Dialog + Toast.
- [ ] **Badges carry text + icon/semantic color** (never color alone).
- [ ] **Motion ≤ 300ms, transform/opacity only.**
- [ ] **Imports resolve from `@datavex/ui-theme`** — never duplicate a primitive inside an app.

---

## 16. Appendix — Design Debt Register (from the August 2026 audit)

Every item lists the finding, the canonical rule (§), and the migration. Status: ✅ resolved · 🟡 partial · ⬜ open.

| ID | Finding | Canonical rule | Migration | Status |
| :--- | :--- | :--- | :--- | :--- |
| D-01 | `Button` primitive hardcodes `#C81D25`/`#A0171E` | §3.1, §8.3 | Use `bg-primary hover:bg-[var(--shell-action)]` (or `--shell-brand`/`--shell-action` vars) | ✅
| D-02 | 8 distinct reds shipped (`#C81D25`, `#70171D`, `#72161B`, `#B32428`, `#dc2626`…) | §3.1 | Collapse to `brand/action/header/danger`; replace usages | ✅
| D-03 | ~15 duplicated `statusVariant`/`statusStyles` maps; billing-ui uses raw Tailwind tints | §7.1–7.2 | Add semantic Badge variants + shared `statusVariant` to ui-theme; delete per-page maps | ✅
| D-04 | Control heights drift h-8/h-9/h-10 across apps (48/130/17 in erp-shell) | §8.3 | Primitives default to `h-9`; `h-7` compact; migrate page overrides | ✅
| D-05 | Radius mismatch: buttons 4px vs inputs 8px | §5.2 | Unify controls at `rounded-md` (6px) | ✅
| D-06 | No `prefers-reduced-motion` support; decorative animations run unconditionally | §12, §13 | Add media-query guard in `globals.css` | ✅
| D-07 | `EmptyState`, `SearchInput`, `LoadingSpinner` exist but are not exported from `index.ts` | §8.1 | Export + adopt; header search should use `SearchInput` | ✅
| D-08 | Dead `dark:` variants in components (billing-ui status styles) with no toggle | §3.2 | Strip `dark:` variants until dark mode ships | ✅
| D-09 | `open_complaints` KPI rendered in erp-shell dashboard but no module returns it (always 0) | §9.3 | Remove or wire to a real source | ✅ Removed from dashboard + type + erp-service aggregation; slot now shows real `total_leads` |
| D-10 | Raw `window.confirm`/`alert` in several CRM pages (incl. ported ones) | §10 | Replace with confirm Dialog + Toast | ✅
| D-11 | Notification type tints use Tailwind palette (`bg-blue-500/10…`) while status tokens exist | §7.3 | Optionally map to `--shell-*` tokens for consistency | ✅ `TYPE_META` (INFO/SUCCESS/WARNING/ERROR/ACTION) + toaster tints now use `--shell-*` tokens; domain badges keep the §14.2 palette |
| D-12 | `--shell-info` referenced but undefined in `globals.css` | §3.4 | Add token | ✅
| D-13 | Duplicate per-app `lib/utils` with drifting implementations of `money`/`statusVariant` | §7.2, §15 | Hoist shared formatters to ui-theme | ✅
| D-14 | Missing primitives (Tabs, Tooltip, DropdownMenu, Skeleton, Switch, Checkbox, Toast, Avatar…) | §8.1 | Add to ui-theme before building new pages | ✅ Full set shipped: `Skeleton`, `Tabs`, `Toaster`, `ConfirmDialog`, `Tooltip`, `DropdownMenu`, `Switch`, `Checkbox`, `Avatar`, `Separator`, `Pagination`, `Breadcrumb` |
| D-15 | `step-form` CSS forces uppercase micro-caps labels against §4.2 | §4.2, §10 | Migrate to 13px sentence-case labels | ✅ |
