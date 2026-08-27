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

// Real-time cross-module notifications
export * from "./components/ui/notification-provider";
export * from "./components/ui/notification-bell";

// Loading & layout primitives
export * from "./components/ui/skeleton";
export * from "./components/ui/tabs";
export * from "./components/ui/toaster";

// Accessible confirmation dialogs (replaces window.confirm)
export * from "./components/ui/confirm-dialog";

// Interaction primitives (D-14)
export * from "./components/ui/tooltip";
export * from "./components/ui/dropdown-menu";
export * from "./components/ui/switch";
export * from "./components/ui/checkbox";
export * from "./components/ui/avatar";
export * from "./components/ui/separator";

// Navigation primitives (D-14)
export * from "./components/ui/pagination";
export * from "./components/ui/breadcrumb";

// Shared composites
export * from "./components/shared/multi-step-dialog";
export * from "./components/shared/empty-state";
export * from "./components/shared/search-input";
export * from "./components/shared/loading-spinner";
export * from "./components/shared/page-header";
export * from "./components/shared/kpi-card";
export * from "./components/shared/section-heading";
export * from "./components/shared/theme-provider";
export * from "./components/shared/theme-toggle";

// File management (MinIO presigned URL pattern)
export * from "./components/shared/file-upload";
export * from "./components/shared/file-viewer";
export * from "./components/shared/file-preview-modal";
export * from "./components/shared/search-filter";
export * from "./components/shared/status-filter";
export * from "./components/shared/skeleton-patterns";

// Export common utilities
export { cn } from "./lib/utils";
export * from "./lib/utils";
export * from "./utils/toast";
export * from "./lib/error-handler";
export * from "./lib/color-maps";
export * from "./lib/file-helpers";
