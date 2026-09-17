"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "../ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative h-9 w-9 rounded-md text-foreground/80 transition-all hover:bg-muted hover:text-foreground cursor-pointer border border-border/60 shadow-2xs"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500 hover:text-amber-600 dark:text-amber-400" />
      <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sky-400 dark:text-sky-300" />
      <span className="sr-only">Toggle Theme</span>
    </Button>
  );
}
