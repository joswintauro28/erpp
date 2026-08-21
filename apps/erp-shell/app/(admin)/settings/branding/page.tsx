"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Sparkles, Palette } from "lucide-react";

const brandColors = [
  { label: "Primary", hex: "var(--shell-brand)", var: "--shell-brand" },
  { label: "Action", hex: "var(--shell-brand)", var: "--shell-action" },
  { label: "Accent", hex: "#E5B83C", var: "--shell-accent" },
  { label: "Surface", hex: "#1A1A1A", var: "--shell-surface" },
  { label: "Foreground", hex: "#FFFFFF", var: "--shell-foreground" },
  { label: "Muted", hex: "#A3A3A3", var: "--shell-muted" },
];

export default function Branding() {
  return (
    <div className="relative space-y-6">
      {/* Brand Sweep Line */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Branding
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Customise your brand identity and appearance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)] hover:shadow-md transition-shadow duration-200">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--shell-brand)]" />
              <CardTitle className="text-sm font-semibold text-[var(--shell-foreground)]">Logo &amp; Identity</CardTitle>
            </div>
            <CardDescription className="text-xs text-[var(--shell-muted)]">Upload your company logo and favicon</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface-alt)] text-sm font-bold text-[var(--shell-accent)]">
                  DV
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="hover:bg-[var(--shell-surface-alt)]">Upload</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">Remove</Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Favicon</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--shell-border)] bg-[var(--shell-brand)] text-[10px] font-bold text-white">
                  D
                </div>
                <Button variant="outline" size="sm" className="hover:bg-[var(--shell-surface-alt)]">Upload</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)] hover:shadow-md transition-shadow duration-200">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-[var(--shell-brand)]" />
              <CardTitle className="text-sm font-semibold text-[var(--shell-foreground)]">Brand Colors</CardTitle>
            </div>
            <CardDescription className="text-xs text-[var(--shell-muted)]">Define your brand colour palette</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            {brandColors.map((c) => (
              <div key={c.label} className="flex items-center justify-between py-1.5 border-b border-[var(--shell-border)]/40 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-5 w-5 rounded border border-[var(--shell-border)]" style={{ backgroundColor: c.hex }} />
                  <span className="text-sm font-medium text-[var(--shell-foreground)]">{c.label}</span>
                  <span className="text-xs font-mono text-[var(--shell-muted)]">{c.var}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input className="w-24 font-mono text-xs h-8" defaultValue={c.hex} />
                  <Button variant="ghost" size="icon-sm" className="hover:bg-[var(--shell-surface-alt)]">
                    <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: c.hex }} />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)] hover:shadow-md transition-shadow duration-200">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-[var(--shell-foreground)]">Email Templates</CardTitle>
          <CardDescription className="text-xs text-[var(--shell-muted)]">Customise email sender details and default template</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Sender Name</Label>
              <Input defaultValue="DATAVEX ERP" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--shell-muted)] font-medium">Sender Email</Label>
              <Input type="email" defaultValue="noreply@datavex.in" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[var(--shell-muted)] font-medium">Email Footer Text</Label>
            <Input defaultValue="© 2024 DATAVEX Technologies Pvt Ltd. All rights reserved." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[var(--shell-muted)] font-medium">Email Logo</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface-alt)] text-xs font-bold text-[var(--shell-accent)]">
                DV
              </div>
              <Button variant="outline" size="sm" className="hover:bg-[var(--shell-surface-alt)]">Upload</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--shell-border)]">
        <Button variant="outline" size="sm" className="hover:bg-[var(--shell-surface-alt)]">Cancel</Button>
        <Button size="sm" className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white">
          <Save className="mr-1.5 h-3.5 w-3.5" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
