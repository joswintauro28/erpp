import "./Badge.css";
import { ReactNode } from "react";

interface BadgeProps {
  variant?: string;
  children: ReactNode;
  className?: string;
}

export default function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
}
