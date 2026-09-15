"use client";

import * as React from "react";
import { HexColorPicker } from "react-colorful";
import { cn } from "../../lib/utils";

export interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ color, onChange, className }: ColorPickerProps) {
  return (
    <HexColorPicker
      color={color}
      onChange={onChange}
      className={cn("w-full", className)}
    />
  );
}

export { HexColorPicker };
