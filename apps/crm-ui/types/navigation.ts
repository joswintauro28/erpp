import { type LucideIcon } from "lucide-react";

export interface NavChild {
  name: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
}

export interface NavGroup {
  name: string;
  icon: LucideIcon;
  children: NavChild[];
}

export interface NavLink {
  name: string;
  href: string;
  icon: LucideIcon;
}

export type NavItem = NavLink | NavGroup;
