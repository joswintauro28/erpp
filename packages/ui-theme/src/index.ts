// Shared design system configurations
export const DESIGN_SYSTEM = {
  name: "DATAVEX Design System",
  version: "0.1.0",
  theme: "Milled Crimson & Oxide Gold",
};

// Export shared UI components
export * from "./components/ui/badge";
export * from "./components/ui/button";
export * from "./components/ui/card";
export * from "./components/ui/dialog";
export * from "./components/ui/input";
export * from "./components/ui/label";
export * from "./components/ui/progress";
export * from "./components/ui/select";
export * from "./components/ui/spinner";
export * from "./components/ui/table";
export * from "./components/ui/textarea";

// Export common utilities
export { cn } from "./lib/utils";
export * from "./components/shared/multi-step-dialog";
