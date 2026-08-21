"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search...", className }: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState("");
  const isControlled = value !== undefined && onChange !== undefined;
  const currentValue = isControlled ? value : internalValue;

  return (
    <div className={`relative ${className ?? ""}`}>
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
      <Input
        placeholder={placeholder}
        className="pl-8"
        value={currentValue}
        onChange={(e) => {
          if (isControlled) onChange!(e.target.value);
          else setInternalValue(e.target.value);
        }}
        aria-label={placeholder}
      />
    </div>
  );
}
