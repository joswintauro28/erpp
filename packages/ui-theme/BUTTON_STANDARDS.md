# Button & Badge Standards

## Button Variants

| Variant | Use When | Example |
|---|---|---|
| `default` | Primary action (Submit, Create, Save) | Form submit buttons |
| `outline` | Secondary action (Cancel, Edit, View) | Modal cancel buttons, table row actions |
| `ghost` | Tertiary/minimal action (icon-only, hover) | Table row icon buttons, toolbar actions |
| `destructive` | Destructive action (Delete, Remove) | Delete buttons, danger zone actions |
| `link` | Navigation-style action | "Learn more", "View details" links |

## Button Sizes

| Size | Dimensions | Use When |
|---|---|---|
| `default` | h-9 px-2.5 | Page-level CTAs (Create, Record, Add New) |
| `xs` | h-6 px-2 text-xs | Compact inline actions, filter tags |
| `sm` | h-7 px-2.5 | Modal footers, form actions, wizard buttons |
| `lg` | h-10 px-2.5 | Hero CTAs, dashboard primary actions |
| `icon` | size-9 | Standalone icon buttons (toolbar) |
| `icon-xs` | size-6 | Tiny close/dismiss buttons |
| `icon-sm` | size-7 | Table row icon buttons |
| `icon-lg` | size-10 | Large standalone icons |

## Button Patterns

### Form Submit Button
```tsx
<Button type="submit" disabled={submitting}>
  {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
  {submitting ? "Saving..." : "Create Record"}
</Button>
```

### Table Row Actions
```tsx
<Button variant="ghost" size="icon-sm" onClick={handleEdit}>
  <Pencil className="h-3.5 w-3.5" />
</Button>
<Button variant="ghost" size="icon-sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
  <Trash2 className="h-3.5 w-3.5" />
</Button>
```

### Modal Footer
```tsx
<DialogFooter>
  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
  <Button type="submit" disabled={submitting}>
    {submitting ? "Saving..." : "Save"}
  </Button>
</DialogFooter>
```

## Badge Variants

| Variant | Use When | Visual |
|---|---|---|
| `default` | Active/primary status (Paid, Active) | Filled background |
| `secondary` | Neutral status (Draft, Pending) | Subtle background |
| `destructive` | Error/critical status (Overdue, Cancelled) | Red background |
| `outline` | Informational status (Sent, In Review) | Border only |
| `neutral` | General status (default fallback) | Gray background |

## Badge Patterns

### Status Badge
```tsx
<Badge variant={status === "Paid" ? "default" : status === "Overdue" ? "destructive" : "secondary"}>
  {status}
</Badge>
```

### Count Badge
```tsx
<Badge variant="outline" className="text-xs">
  {items.length}
</Badge>
```

## Rules

1. **Always specify a `size` prop** — no implicit defaults for consistency
2. **Modal footers use `sm`** — both submit and cancel buttons
3. **Page-level CTAs use `default`** — Create, Record, Add New buttons
4. **Table row actions use `icon-sm`** with `variant="ghost"`
5. **Never use `secondary` variant** — use `outline` instead
6. **Always add `Loader2` spinner to submitting buttons**
7. **Always disable submit buttons during submission** (`disabled={submitting}`)
8. **Destructive buttons use `variant="destructive"`** — no hardcoded red classes
9. **Badges use variants only** — no hardcoded colors in Badge className
10. **Prefer `Button` over raw `<button>`** — ensures consistent styling and accessibility
