import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

export function LoadingSpinner({ className, size = 8 }: LoadingSpinnerProps) {
  return (
    <div className={`flex h-[60vh] items-center justify-center ${className ?? ""}`}>
      <Loader2 className={`h-${size} w-${size} animate-spin text-[var(--shell-muted)]`} />
    </div>
  );
}
