"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Sparkles, Palette } from "lucide-react";

const brandColors = [
  { label: "Primary", hex: "#96282E", var: "--shell-brand" },
  { label: "Action", hex: "#C81D25", var: "--shell-action" },
  { label: "Accent", hex: "#CBA052", var: "--shell-brass" },
  { label: "Surface", hex: "#272A30", var: "--shell-surface" },
  { label: "Foreground", hex: "#111827", var: "--shell-foreground" },
  { label: "Muted", hex: "#6B7280", var: "--shell-muted" },
];

export default function Branding() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Branding
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Customise your brand identity and appearance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[--shell-action]" />
              <CardTitle className="text-sm font-medium">Logo &amp; Identity</CardTitle>
            </div>
            <CardDescription className="text-xs">Upload your company logo and favicon</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Company Logo</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[--shell-border] bg-[--shell-surface] text-xs font-bold text-[--shell-brass]">
                  DV
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Upload</Button>
                  <Button variant="ghost" size="sm">Remove</Button>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Favicon</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-[--shell-border] bg-[--shell-brand] text-[10px] font-bold text-white">
                  D
                </div>
                <Button variant="outline" size="sm">Upload</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-[--shell-action]" />
              <CardTitle className="text-sm font-medium">Brand Colors</CardTitle>
            </div>
            <CardDescription className="text-xs">Define your brand colour palette</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {brandColors.map((c) => (
              <div key={c.label} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded border border-[--shell-border]" style={{ backgroundColor: c.hex }} />
                  <span className="text-sm">{c.label}</span>
                  <span className="text-xs font-mono text-[--shell-muted]">{c.var}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input className="w-24 font-mono text-xs h-8" defaultValue={c.hex} />
                  <Button variant="ghost" size="icon-sm"><div className="h-3 w-3 rounded-full bg-black/10" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-medium">Email Templates</CardTitle>
          <CardDescription className="text-xs">Customise email sender details and default template</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Sender Name</Label>
              <Input defaultValue="DATAVEX ERP" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sender Email</Label>
              <Input type="email" defaultValue="noreply@datavex.in" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email Footer Text</Label>
            <Input defaultValue="© 2024 DATAVEX Technologies Pvt Ltd. All rights reserved." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email Logo</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded border border-[--shell-border] bg-[--shell-surface] text-xs font-bold text-[--shell-brass]">
                DV
              </div>
              <Button variant="outline" size="sm">Upload</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[--shell-border]">
        <Button variant="outline" size="sm">Cancel</Button>
        <Button size="sm"><Save className="mr-1.5 h-3.5 w-3.5" />Save Changes</Button>
      </div>
    </div>
  );
}
