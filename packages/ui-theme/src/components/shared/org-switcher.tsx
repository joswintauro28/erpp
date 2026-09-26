"use client";

import * as React from "react";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";
import { api, setAccessToken } from "@datavex/auth-middleware";
import type { UserOrganization } from "@datavex/auth-middleware";

import { cn } from "../../lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export interface OrgSwitcherProps {
  organizations?: UserOrganization[] | null;
  currentId?: number | null;
  currentName?: string | null;
  onSwitched?: () => unknown;
  className?: string;
}

const chipClass =
  "inline-flex max-w-[220px] items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-foreground";

export function OrgSwitcher({
  organizations,
  currentId,
  currentName,
  onSwitched,
  className,
}: OrgSwitcherProps) {
  const orgs = React.useMemo(
    () => (organizations ?? []).filter((o) => o && o.id != null),
    [organizations],
  );
  const [switching, setSwitching] = React.useState(false);

  const activeOrg = orgs.find((o) => o.id === currentId);
  const label = activeOrg?.name || currentName || "Workspace";

  const handleSwitch = async (orgId: number) => {
    if (switching || orgId === currentId) return;
    setSwitching(true);
    try {
      const res = await api.post<{ access_token: string }>(
        `/auth/organizations/${orgId}/switch`,
      );
      setAccessToken(res.access_token);
      await onSwitched?.();
    } catch {
      // Keep current organization on failure; chip stays as-is
    } finally {
      setSwitching(false);
    }
  };

  // User not loaded yet — render nothing to avoid a placeholder flash
  if (orgs.length === 0 && !currentName) {
    return null;
  }

  if (orgs.length <= 1) {
    return (
      <span
        className={cn(chipClass, className)}
        title={activeOrg?.parent_name ? `Under ${activeOrg.parent_name}` : undefined}
        data-testid="org-chip"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          chipClass,
          "cursor-pointer outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
          switching && "opacity-70",
          className,
        )}
        aria-label={`Organization: ${label}. Switch organization`}
        data-testid="org-switcher-trigger"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
        <span className="truncate">{label}</span>
        {switching ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch organization</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {orgs.map((org) => {
          const isActive = org.id === currentId;
          return (
            <DropdownMenuItem
              key={org.id}
              disabled={switching || isActive}
              onClick={() => handleSwitch(org.id)}
              data-testid={`org-option-${org.id}`}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-medium">{org.name}</span>
                  {isActive && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-shell-brand" aria-hidden />
                  )}
                </span>
                {org.parent_name && (
                  <span className="truncate text-[11px] text-muted-foreground">
                    Under {org.parent_name}
                  </span>
                )}
              </span>
              {org.role && (
                <span className="ml-auto shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                  {org.role}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
        {switching && (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Switching…
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
