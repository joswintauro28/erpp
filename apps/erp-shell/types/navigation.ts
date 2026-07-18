import { type LucideIcon } from "lucide-react";

export interface NavChild {
  name: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
}

export interface NavSection {
  name: string;
  children: NavChild[];
}

export interface NavGroup {
  name: string;
  icon: LucideIcon;
  sections: NavSection[];
}

export interface NavLink {
  name: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
}

export type NavItem = NavLink | NavGroup;
