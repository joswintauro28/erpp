# erp-shell — DATAVEX ERP Frontend

Next.js 16 (Turbopack) application with TypeScript, Tailwind CSS v4, and shadcn/ui.

---

## Technical Stack

* **Framework**: Next.js 16.2.10 (Turbopack compile root)
* **Language**: TypeScript
* **Styling**: Tailwind CSS v4 (native `@theme` configurations)
* **UI Base**: shadcn/ui components customized for a premium "Modern Industrial" theme
* **Fonts**: Montserrat (headings), Inter (body), JetBrains Mono (code)
* **Icons**: lucide-react

---

## Directory Structure

```
app/
├── layout.tsx              # Root layout injecting Inter, Montserrat, and AuthProvider
├── globals.css             # Theme tokens, custom animations, input alignments
├── (auth)/login/           # User authentication login view
├── (admin)/
│   ├── layout.tsx          # Router auth-guard, premium sidebar and header wrappers
│   ├── loading.tsx         # skeleton layout loaders
│   ├── dashboard/          # Analytics metrics, revenue trend charts, and invoices lists
│   ├── crm/leads/          # Leads pipe management (wired to API)
│   ├── crm/clients/        # Client database and detailed statistics (wired to API)
│   ├── billing/            # Invoices, quotations, recurring bills, credit/debit notes
│   ├── accounting/         # General ledger, chart of accounts, expenses, financial reports
│   └── inventory/          # Products, warehouses, batches, procurement, and stock levels
components/
├── Sidebar.tsx              # Dynamic collapsible navigation with hover flyouts for collapsed mode
├── Header.tsx               # Primary header controls and alert center
├── multi-step-dialog.tsx    # Reusable step wizard with key-isolated transitions and auto-sizing
└── ui/                      # shadcn/ui base elements
services/
└── api.ts                   # Fetch API wrapper with 401 refresh token interceptors
utils/
└── format.ts                # Numeric formatter helper functions
contexts/
└── AuthContext.tsx           # Global user authentication session manager
```

---

## Theme & Color Design

The interface adopts a high-end **"Modern Industrial"** theme configured in [globals.css](file:///c:/Users/ajith/Videos/Projects/DATAVEX/ERP/apps/erp-shell/app/globals.css):

| CSS Variable | Tailwind Utility Class | Hex Color | Usage |
| :--- | :--- | :--- | :--- |
| `--sidebar` | `bg-sidebar` | `#191B1F` | Deep premium carbon background |
| `--sidebar-foreground` | `text-sidebar-foreground` | `rgba(255,255,255,0.78)` | Silver high-contrast menu text |
| `--sidebar-primary` | `text-sidebar-primary` | `#CBA052` | Brushed Brass accent color |
| `--sidebar-accent` | `bg-sidebar-accent` | `rgba(203,160,82,0.06)` | Warm brass glow hover indicator |
| `--sidebar-border` | `border-sidebar-border` | `rgba(203,160,82,0.12)` | Subtle brass line borders |
| `--shell-brand` | `bg-primary` | `#8C1D24` | Crimson Red primary brand button color |
| `--shell-action` | `bg-[var(--shell-action)]` | `#B32428` | Clickable action button background |

---

## Premium UI/UX Implementation Details

### 1. Key-Isolated Multi-Step Modals
All wizard modals (`MultiStepDialog`) calculate step states (`isFirstStep`, `isLastStep`) internally using the actual array size, preventing parent state lag. Buttons are assigned unique keys (`key="next-button"`, `key="submit-button"`) to prevent React from reusing DOM elements during transitions, which resolves the browser click-bubble submission bug.

### 2. Micro-Caps Form Inputs
Labels inside multi-step dialogs are automatically formatted in uppercase micro-caps with wide tracking (`letter-spacing: 0.04em`) and positioned exactly `4px` above text inputs to create close logical groupings. Inputs are sized to `13px` (`0.8125rem`) and standard `36px` (`h-9`) heights to fit compact modal viewports comfortably.

### 3. Smart Sidebar Hover Flyouts
When the sidebar is collapsed to `64px`, hovering over any group menu icon opens a floating submenu positioned at the icon's exact height. Transition timers (150ms buffer) allow the mouse to move to the flyout menu smoothly without the menu closing.

---

## Running the Application

Ensure database service is active before running:

```bash
# Copy settings
copy .env.example .env

# Install dependencies
bun install

# Run cache cleaning startup script
.\run.ps1
```

Access frontend local server at: [http://localhost:3000](http://localhost:3000).
Proxy routes are mapped automatically: `/api/*` rewrites to `http://127.0.0.1:8000`.
