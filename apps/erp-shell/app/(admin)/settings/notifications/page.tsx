"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Save, Mail, Bell, Smartphone } from "lucide-react";

const channelConfig = [
  { id: "email_inv", label: "New Invoice", channel: "email", enabled: true },
  { id: "email_pay", label: "Payment Received", channel: "email", enabled: true },
  { id: "email_over", label: "Invoice Overdue", channel: "email", enabled: true },
  { id: "email_quote", label: "Quote Expiry", channel: "email", enabled: false },
  { id: "email_lead", label: "Lead Assignment", channel: "email", enabled: true },
  { id: "email_po", label: "Purchase Order", channel: "email", enabled: true },
  { id: "sms_over", label: "Invoice Overdue", channel: "sms", enabled: true },
  { id: "sms_pay", label: "Payment Confirmation", channel: "sms", enabled: false },
  { id: "sms_quote", label: "Quote Follow-up", channel: "sms", enabled: false },
  { id: "push_inv", label: "New Invoice", channel: "push", enabled: true },
  { id: "push_over", label: "Invoice Overdue", channel: "push", enabled: true },
  { id: "push_stock", label: "Low Stock Alert", channel: "push", enabled: true },
  { id: "push_lead", label: "Lead Created", channel: "push", enabled: true },
];

export default function Notifications() {
  const [config, setConfig] = useState(channelConfig);

  const toggle = (id: string) => {
    setConfig((prev) => prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)));
  };

  const byChannel = (channel: string) => config.filter((c) => c.channel === channel);

  return (
    <div className="relative space-y-6">
      {/* Brand Sweep Line */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[#8C1D24] shimmer-glow" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Notifications
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Configure email, SMS, and push notification preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)] hover:shadow-md transition-shadow duration-200">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#8C1D24]" />
              <CardTitle className="text-sm font-semibold text-[var(--shell-foreground)]">Email Notifications</CardTitle>
            </div>
            <CardDescription className="text-xs text-[var(--shell-muted)]">Configure automated email alerts</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-2">
            {byChannel("email").map((c) => (
              <label key={c.id} className="flex items-center justify-between py-2 border-b border-[var(--shell-border)]/20 last:border-0 cursor-pointer text-[var(--shell-foreground)] hover:text-[#8C1D24] transition-colors">
                <span className="text-sm font-medium">{c.label}</span>
                <input
                  type="checkbox"
                  checked={c.enabled}
                  onChange={() => toggle(c.id)}
                  className="h-4 w-4 rounded border-[var(--shell-border)] accent-[#8C1D24] cursor-pointer"
                />
              </label>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)] hover:shadow-md transition-shadow duration-200">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-[#8C1D24]" />
              <CardTitle className="text-sm font-semibold text-[var(--shell-foreground)]">SMS Notifications</CardTitle>
            </div>
            <CardDescription className="text-xs text-[var(--shell-muted)]">Configure SMS alerts for critical events</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-2">
            {byChannel("sms").map((c) => (
              <label key={c.id} className="flex items-center justify-between py-2 border-b border-[var(--shell-border)]/20 last:border-0 cursor-pointer text-[var(--shell-foreground)] hover:text-[#8C1D24] transition-colors">
                <span className="text-sm font-medium">{c.label}</span>
                <input
                  type="checkbox"
                  checked={c.enabled}
                  onChange={() => toggle(c.id)}
                  className="h-4 w-4 rounded border-[var(--shell-border)] accent-[#8C1D24] cursor-pointer"
                />
              </label>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)] hover:shadow-md transition-shadow duration-200">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#8C1D24]" />
              <CardTitle className="text-sm font-semibold text-[var(--shell-foreground)]">Push Notifications</CardTitle>
            </div>
            <CardDescription className="text-xs text-[var(--shell-muted)]">In-app and browser push alerts</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-2">
            {byChannel("push").map((c) => (
              <label key={c.id} className="flex items-center justify-between py-2 border-b border-[var(--shell-border)]/20 last:border-0 cursor-pointer text-[var(--shell-foreground)] hover:text-[#8C1D24] transition-colors">
                <span className="text-sm font-medium">{c.label}</span>
                <input
                  type="checkbox"
                  checked={c.enabled}
                  onChange={() => toggle(c.id)}
                  className="h-4 w-4 rounded border-[var(--shell-border)] accent-[#8C1D24] cursor-pointer"
                />
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--shell-border)] bg-[var(--shell-surface)] hover:shadow-md transition-shadow duration-200">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-[var(--shell-foreground)]">Alert Thresholds</CardTitle>
          <CardDescription className="text-xs text-[var(--shell-muted)]">Configure when notifications are triggered</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-xs text-[var(--shell-muted)] font-medium">Overdue Reminder (days)</Label>
            <div className="flex items-center gap-2">
              {[1, 3, 7, 14].map((d) => (
                <Badge 
                  key={d} 
                  variant={d === 7 ? "default" : "outline"} 
                  className={`cursor-pointer text-xs font-semibold px-2.5 py-1 ${
                    d === 7 
                      ? "bg-[#8C1D24]/10 text-[#8C1D24] border-[#8C1D24]/20 hover:bg-[#8C1D24]/20" 
                      : "border-[var(--shell-border)] hover:bg-[var(--shell-surface-alt)]"
                  }`}
                >
                  {d}d
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-[var(--shell-muted)] font-medium">Low Stock Threshold</Label>
            <div className="flex items-center gap-2">
              {["10%", "20%", "30%", "50%"].map((p) => (
                <Badge 
                  key={p} 
                  variant={p === "20%" ? "default" : "outline"} 
                  className={`cursor-pointer text-xs font-semibold px-2.5 py-1 ${
                    p === "20%" 
                      ? "bg-[#8C1D24]/10 text-[#8C1D24] border-[#8C1D24]/20 hover:bg-[#8C1D24]/20" 
                      : "border-[var(--shell-border)] hover:bg-[var(--shell-surface-alt)]"
                  }`}
                >
                  {p}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-[var(--shell-muted)] font-medium">Quote Expiry Warning</Label>
            <div className="flex items-center gap-2">
              {["1d", "3d", "7d"].map((d) => (
                <Badge 
                  key={d} 
                  variant={d === "3d" ? "default" : "outline"} 
                  className={`cursor-pointer text-xs font-semibold px-2.5 py-1 ${
                    d === "3d" 
                      ? "bg-[#8C1D24]/10 text-[#8C1D24] border-[#8C1D24]/20 hover:bg-[#8C1D24]/20" 
                      : "border-[var(--shell-border)] hover:bg-[var(--shell-surface-alt)]"
                  }`}
                >
                  {d}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--shell-border)]">
        <Button variant="outline" size="sm" className="hover:bg-[var(--shell-surface-alt)]">Cancel</Button>
        <Button size="sm" className="bg-[#8C1D24] hover:bg-[#8C1D24]/90 text-white shadow">
          <Save className="mr-1.5 h-3.5 w-3.5" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
